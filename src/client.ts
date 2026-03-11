import type { AuthProvider } from "./auth.js";
import { APIKeyAuth, JWTAuth } from "./auth.js";
import { isLikelyLocalRuntimeUrl, requestJson, trimRightSlash, type RequestJsonOptions, type ServiceName } from "./http.js";
import { AlertsClient } from "./clients/alerts.js";
import { ArbiterClient } from "./clients/arbiter.js";
import { ChronosClient } from "./clients/chronos.js";
import { ControlplaneClient } from "./clients/controlplane.js";
import { IncidentsClient } from "./clients/incidents.js";
import { KernelClient } from "./clients/kernel.js";
import { MarketplaceClient } from "./clients/marketplace.js";
import { MeshgateClient } from "./clients/meshgate.js";
import { TracesClient } from "./clients/traces.js";

export type SentinosClientConfig = {
  baseUrl?: string | null;
  kernelUrl: string;
  arbiterUrl: string;
  chronosUrl: string;
  controlplaneUrl: string;
  meshgateUrl: string;
  tenantId?: string;
  timeoutMs: number;
};

export type SentinosClientOptions = {
  baseUrl?: string;
  apiUrl?: string;
  url?: string;
  kernelUrl?: string;
  arbiterUrl?: string;
  chronosUrl?: string;
  controlplaneUrl?: string;
  meshgateUrl?: string;
  tenantId?: string;
  orgId?: string;
  authToken?: string;
  auth?: AuthProvider;
  timeoutMs?: number;
  timeoutSeconds?: number;
  fetchImpl?: typeof fetch;
};

function normalizeUrl(url: string): string {
  return trimRightSlash(url.trim());
}

function resolveTenantId(tenantId?: string, orgId?: string): string | undefined {
  if (tenantId && orgId && tenantId !== orgId) {
    throw new Error("tenantId and orgId must match when both are provided");
  }
  return (tenantId ?? orgId)?.trim() || undefined;
}

function resolveTimeoutMs(opts: SentinosClientOptions): number {
  if (opts.timeoutMs !== undefined) return opts.timeoutMs;
  if (opts.timeoutSeconds !== undefined) return Math.max(0, Math.floor(opts.timeoutSeconds * 1000));
  return 30_000;
}

export class SentinosClient {
  readonly config: SentinosClientConfig;
  readonly kernel: KernelClient;
  readonly arbiter: ArbiterClient;
  readonly chronos: ChronosClient;
  readonly controlplane: ControlplaneClient;
  readonly traces: TracesClient;
  readonly alerts: AlertsClient;
  readonly incidents: IncidentsClient;
  readonly marketplace: MarketplaceClient;
  readonly meshgate: MeshgateClient;

  private readonly fetchImpl: typeof fetch;
  private readonly authToken?: string;
  private readonly auth?: AuthProvider;

  constructor(opts: SentinosClientOptions = {}) {
    const baseUrl = (opts.baseUrl ?? opts.apiUrl ?? opts.url)?.trim() || undefined;
    const normalizedBaseUrl = baseUrl ? normalizeUrl(baseUrl) : undefined;

    const kernelUrl = normalizeUrl(opts.kernelUrl ?? normalizedBaseUrl ?? "http://localhost:8081");
    const arbiterUrl = normalizeUrl(opts.arbiterUrl ?? normalizedBaseUrl ?? "http://localhost:8082");
    const chronosUrl = normalizeUrl(opts.chronosUrl ?? normalizedBaseUrl ?? "http://localhost:8083");

    const controlplaneUrl = normalizeUrl(
      opts.controlplaneUrl ??
        (normalizedBaseUrl && !isLikelyLocalRuntimeUrl(normalizedBaseUrl) ? normalizedBaseUrl : "http://localhost:18084")
    );
    const meshgateUrl = normalizeUrl(
      opts.meshgateUrl ??
        (normalizedBaseUrl && !isLikelyLocalRuntimeUrl(normalizedBaseUrl) ? normalizedBaseUrl : "http://localhost:8085")
    );

    const tenantId = resolveTenantId(opts.tenantId, opts.orgId);
    const timeoutMs = resolveTimeoutMs(opts);

    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.authToken = (opts.authToken || "").trim() || undefined;
    this.auth = opts.auth;

    this.config = {
      baseUrl: normalizedBaseUrl ?? null,
      kernelUrl,
      arbiterUrl,
      chronosUrl,
      controlplaneUrl,
      meshgateUrl,
      tenantId,
      timeoutMs,
    };

    this.kernel = new KernelClient(this, tenantId);
    this.arbiter = new ArbiterClient(this, tenantId);
    this.chronos = new ChronosClient(this, tenantId);
    this.controlplane = new ControlplaneClient(this, tenantId);
    this.traces = new TracesClient(this, tenantId);
    this.alerts = new AlertsClient(this, tenantId);
    this.incidents = new IncidentsClient(this, tenantId);
    this.marketplace = new MarketplaceClient(this, tenantId);
    this.meshgate = new MeshgateClient(this, tenantId);
  }

  static simple(
    baseUrl: string,
    opts?: {
      tenantId?: string;
      orgId?: string;
      authToken?: string;
      auth?: AuthProvider;
      timeoutMs?: number;
      timeoutSeconds?: number;
      fetchImpl?: typeof fetch;
    }
  ): SentinosClient {
    return new SentinosClient({ baseUrl, ...opts });
  }

  static fromEnv(opts?: {
    baseUrl?: string;
    tenantId?: string;
    orgId?: string;
    authToken?: string;
    timeoutSeconds?: number;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }): SentinosClient {
    const env = (name: string): string | undefined => {
      const v = process.env[name];
      return v && v.trim() ? v.trim() : undefined;
    };
    const envFirst = (...names: string[]): string | undefined => {
      for (const n of names) {
        const v = env(n);
        if (v) return v;
      }
      return undefined;
    };

    return new SentinosClient({
      baseUrl: opts?.baseUrl ?? envFirst("SENTINOS_BASE_URL", "SENTINOS_API_URL", "SENTINOS_URL"),
      kernelUrl: env("SENTINOS_KERNEL_URL"),
      arbiterUrl: env("SENTINOS_ARBITER_URL"),
      chronosUrl: env("SENTINOS_CHRONOS_URL"),
      controlplaneUrl: env("SENTINOS_CONTROLPLANE_URL"),
      meshgateUrl: env("SENTINOS_MESHGATE_URL"),
      tenantId: opts?.tenantId ?? envFirst("SENTINOS_ORG_ID", "SENTINOS_TENANT_ID"),
      orgId: opts?.orgId,
      authToken: opts?.authToken ?? env("SENTINOS_ACCESS_TOKEN"),
      timeoutSeconds: opts?.timeoutSeconds ?? (env("SENTINOS_TIMEOUT_SECONDS") ? Number(env("SENTINOS_TIMEOUT_SECONDS")) : undefined),
      timeoutMs: opts?.timeoutMs,
      fetchImpl: opts?.fetchImpl,
    });
  }

  async requestJson<T>(service: ServiceName, path: string, opts?: RequestJsonOptions): Promise<T> {
    const baseUrl = this.baseUrlFor(service);
    const authHeaders = await this.resolveAuthHeaders();
    const headers: Record<string, string | undefined> = { ...authHeaders };
    const tenantId = opts?.tenantId ?? this.config.tenantId;
    if (tenantId) headers["x-tenant-id"] = tenantId;

    return requestJson<T>(baseUrl, path, {
      ...(opts || {}),
      fetchImpl: this.fetchImpl,
      defaultHeaders: headers,
      defaultTimeoutMs: this.config.timeoutMs,
    });
  }

  baseUrlFor(service: ServiceName): string {
    switch (service) {
      case "kernel":
        return this.config.kernelUrl;
      case "arbiter":
        return this.config.arbiterUrl;
      case "chronos":
        return this.config.chronosUrl;
      case "controlplane":
        return this.config.controlplaneUrl;
      case "meshgate":
        return this.config.meshgateUrl;
    }
  }

  private async resolveAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (this.authToken) headers["authorization"] = `Bearer ${this.authToken}`;
    if (this.auth) Object.assign(headers, await this.auth.headers());
    return headers;
  }
}

export { APIKeyAuth, JWTAuth };
