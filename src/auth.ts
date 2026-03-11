export interface AuthProvider {
  headers(): Promise<Record<string, string>> | Record<string, string>;
}

export class JWTAuth implements AuthProvider {
  private readonly tokenProvider: () => string | Promise<string>;

  constructor(tokenProvider: () => string | Promise<string>) {
    this.tokenProvider = tokenProvider;
  }

  async headers(): Promise<Record<string, string>> {
    const token = await this.tokenProvider();
    const trimmed = (token || "").trim();
    if (!trimmed) return {};
    return { authorization: `Bearer ${trimmed}` };
  }
}

export class APIKeyAuth implements AuthProvider {
  private readonly apiKey: string;
  private readonly headerName: string;

  constructor(apiKey: string, opts?: { headerName?: string }) {
    this.apiKey = apiKey;
    this.headerName = opts?.headerName ?? "x-api-key";
  }

  headers(): Record<string, string> {
    const trimmed = (this.apiKey || "").trim();
    if (!trimmed) return {};
    return { [this.headerName]: trimmed };
  }
}

export class WorkforceTokenError extends Error {}

export class WorkforcePolicyDeniedError extends WorkforceTokenError {}

export class WorkforceMappingError extends WorkforceTokenError {}

export class WorkforceSessionRevokedError extends WorkforceTokenError {}

export type WorkforceAssertion = {
  externalSubject: string;
  email?: string;
  displayName?: string;
  groups?: string[];
  assertionToken?: string;
  tokenBindingValue?: string;
  deviceId?: string;
};

export type WorkforceAssertionProvider = () => Promise<WorkforceAssertion> | WorkforceAssertion;

function trimOrUndefined(value?: string | null): string | undefined {
  const trimmed = (value || "").trim();
  return trimmed || undefined;
}

function parseUtcDate(raw: string): Date {
  const normalized = raw.trim().endsWith("Z") ? raw.trim() : `${raw.trim()}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new WorkforceTokenError(`invalid workforce token expiration timestamp: ${raw}`);
  }
  return parsed;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    if ("error" in body && typeof (body as Record<string, unknown>).error === "string") {
      return (body as Record<string, unknown>).error as string;
    }
    if ("message" in body && typeof (body as Record<string, unknown>).message === "string") {
      return (body as Record<string, unknown>).message as string;
    }
  }
  if (typeof body === "string" && body.trim()) return body.trim();
  return fallback;
}

export type WorkforceTokenProviderOptions = {
  controlplaneUrl: string;
  orgId: string;
  idpIssuer: string;
  assertionProvider: WorkforceAssertionProvider;
  audience?: string;
  requestedTtlMinutes?: number;
  timeoutMs?: number;
  refreshSkewSeconds?: number;
  fetchImpl?: typeof fetch;
};

export class WorkforceTokenProvider implements AuthProvider {
  readonly controlplaneUrl: string;
  readonly orgId: string;
  readonly idpIssuer: string;
  readonly assertionProvider: WorkforceAssertionProvider;
  readonly audience?: string;
  readonly requestedTtlMinutes?: number;
  readonly timeoutMs: number;
  readonly refreshSkewSeconds: number;

  private readonly fetchImpl: typeof fetch;
  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt?: Date;
  private inFlight?: Promise<string>;

  constructor(opts: WorkforceTokenProviderOptions) {
    const controlplaneUrl = trimOrUndefined(opts.controlplaneUrl);
    const orgId = trimOrUndefined(opts.orgId);
    const idpIssuer = trimOrUndefined(opts.idpIssuer);
    if (!controlplaneUrl) {
      throw new WorkforceTokenError(
        "controlplaneUrl is required for workforce auth (set SENTINOS_CONTROLPLANE_URL or SENTINOS_APP_URL)"
      );
    }
    if (!orgId) {
      throw new WorkforceTokenError("orgId is required for workforce auth");
    }
    if (!idpIssuer) {
      throw new WorkforceTokenError(
        "idpIssuer is required (set SENTINOS_WORKFORCE_IDP_ISSUER or pass idpIssuer explicitly)"
      );
    }

    this.controlplaneUrl = controlplaneUrl.replace(/\/+$/, "");
    this.orgId = orgId;
    this.idpIssuer = idpIssuer;
    this.assertionProvider = opts.assertionProvider;
    this.audience = trimOrUndefined(opts.audience);
    this.requestedTtlMinutes = opts.requestedTtlMinutes;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.refreshSkewSeconds = opts.refreshSkewSeconds ?? 30;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  static fromEnv(
    assertionProvider: WorkforceAssertionProvider,
    opts: {
      controlplaneUrl?: string;
      orgId?: string;
      idpIssuer?: string;
      audience?: string;
      requestedTtlMinutes?: number;
      timeoutMs?: number;
      refreshSkewSeconds?: number;
      fetchImpl?: typeof fetch;
    } = {}
  ): WorkforceTokenProvider {
    const env = (name: string) => trimOrUndefined(process.env[name]);
    const cpUrl = opts.controlplaneUrl ?? env("SENTINOS_CONTROLPLANE_URL") ?? env("SENTINOS_APP_URL") ?? env("SENTINOS_CONSOLE_URL");
    const orgId = opts.orgId ?? env("SENTINOS_ORG_ID");
    const idpIssuer = opts.idpIssuer ?? env("SENTINOS_WORKFORCE_IDP_ISSUER") ?? env("SENTINOS_WORKFORCE_AUTH_MODE");
    const audience = opts.audience ?? env("SENTINOS_WORKFORCE_EXCHANGE_AUDIENCE");
    let requestedTtlMinutes = opts.requestedTtlMinutes;
    if (requestedTtlMinutes === undefined) {
      const ttlRaw = env("SENTINOS_WORKFORCE_REQUESTED_TTL_MINUTES");
      if (ttlRaw) {
        const parsed = Number.parseInt(ttlRaw, 10);
        if (Number.isFinite(parsed)) requestedTtlMinutes = parsed;
      }
    }

    return new WorkforceTokenProvider({
      controlplaneUrl: cpUrl || "",
      orgId: orgId || "",
      idpIssuer: idpIssuer || "",
      assertionProvider,
      audience,
      requestedTtlMinutes,
      timeoutMs: opts.timeoutMs,
      refreshSkewSeconds: opts.refreshSkewSeconds,
      fetchImpl: opts.fetchImpl,
    });
  }

  async headers(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async getAccessToken(): Promise<string> {
    if (this.isFresh()) return this.accessToken || "";
    if (!this.inFlight) {
      this.inFlight = this.refreshOrExchange().finally(() => {
        this.inFlight = undefined;
      });
    }
    return this.inFlight;
  }

  private isFresh(): boolean {
    if (!this.accessToken || !this.expiresAt) return false;
    const refreshAt = this.expiresAt.getTime() - Math.max(0, this.refreshSkewSeconds) * 1000;
    return Date.now() < refreshAt;
  }

  private async refreshOrExchange(): Promise<string> {
    for (let i = 0; i < 2; i += 1) {
      if (this.isFresh()) return this.accessToken || "";
      if (this.refreshToken) {
        try {
          await this.refresh();
        } catch (error) {
          if (
            error instanceof WorkforceSessionRevokedError ||
            error instanceof WorkforceTokenError
          ) {
            await this.exchange();
          } else {
            throw error;
          }
        }
      } else {
        await this.exchange();
      }
    }
    if (!this.accessToken) {
      throw new WorkforceTokenError("workforce token exchange did not return access_token");
    }
    return this.accessToken;
  }

  private async exchange(): Promise<void> {
    const assertion = await this.assertionProvider();
    const externalSubject = trimOrUndefined(assertion.externalSubject);
    if (!externalSubject) {
      throw new WorkforceTokenError("assertionProvider returned empty externalSubject");
    }

    const payload: Record<string, unknown> = {
      org_id: this.orgId,
      idp_issuer: this.idpIssuer,
      external_subject: externalSubject,
    };
    if (trimOrUndefined(assertion.email)) payload.email = assertion.email;
    if (trimOrUndefined(assertion.displayName)) payload.display_name = assertion.displayName;
    if (assertion.groups?.length) payload.groups = assertion.groups;
    if (trimOrUndefined(assertion.assertionToken)) payload.assertion_token = assertion.assertionToken;
    if (trimOrUndefined(assertion.tokenBindingValue)) payload.token_binding_value = assertion.tokenBindingValue;
    if (trimOrUndefined(assertion.deviceId)) payload.device_id = assertion.deviceId;
    if (this.audience) payload.audience = this.audience;
    if (this.requestedTtlMinutes) payload.requested_ttl_minutes = this.requestedTtlMinutes;

    const body = await this.postJson<{ tokens?: Record<string, unknown> }>("/v1/workforce/token/exchange", payload);
    if (!body.tokens || typeof body.tokens !== "object") {
      throw new WorkforceTokenError("exchange response missing tokens object");
    }
    this.setTokens(body.tokens);
  }

  private async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new WorkforceTokenError("missing refresh token");
    }
    const body = await this.postJson<Record<string, unknown>>("/v1/workforce/token/refresh", {
      refresh_token: this.refreshToken,
    });
    this.setTokens(body);
  }

  private setTokens(payload: Record<string, unknown>): void {
    const accessToken = trimOrUndefined(String(payload.access_token ?? ""));
    const refreshToken = trimOrUndefined(String(payload.refresh_token ?? ""));
    const expiresAtRaw = trimOrUndefined(String(payload.expires_at ?? ""));
    if (!accessToken || !refreshToken || !expiresAtRaw) {
      throw new WorkforceTokenError("token payload missing access_token, refresh_token, or expires_at");
    }
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = parseUtcDate(expiresAtRaw);
  }

  private async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.controlplaneUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const contentType = response.headers.get("content-type") || "";
      const raw = contentType.includes("application/json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => undefined);
      if (!response.ok) {
        const message = extractMessage(raw, `HTTP ${response.status}`);
        const lower = message.toLowerCase();
        if (response.status === 410 || lower.includes("revoked") || lower.includes("expired")) {
          throw new WorkforceSessionRevokedError(message);
        }
        if (response.status === 401 || response.status === 403) {
          if (lower.includes("mapping") || lower.includes("group")) {
            throw new WorkforceMappingError(message);
          }
          throw new WorkforcePolicyDeniedError(message);
        }
        throw new WorkforceTokenError(message);
      }
      return raw as T;
    } catch (error) {
      if (
        error instanceof WorkforceTokenError ||
        error instanceof WorkforcePolicyDeniedError ||
        error instanceof WorkforceMappingError ||
        error instanceof WorkforceSessionRevokedError
      ) {
        throw error;
      }
      throw new WorkforceTokenError(`workforce token request failed: ${String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
