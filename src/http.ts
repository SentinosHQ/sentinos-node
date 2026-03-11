export type ServiceName = "kernel" | "arbiter" | "chronos" | "controlplane" | "meshgate";

export type RequestJsonOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  tenantId?: string;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function trimRightSlash(s: string): string {
  return s.endsWith("/") ? s.replace(/\/+$/, "") : s;
}

export function isLikelyLocalRuntimeUrl(baseUrl: string): boolean {
  const u = baseUrl.trim().toLowerCase();
  return u.startsWith("http://localhost:") || u.startsWith("http://127.0.0.1:");
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  opts: RequestJsonOptions & {
    fetchImpl: typeof fetch;
    defaultHeaders?: Record<string, string | undefined>;
    defaultTimeoutMs: number;
  }
): Promise<T> {
  const full = trimRightSlash(baseUrl) + path;
  if (!full.startsWith("http://") && !full.startsWith("https://")) {
    throw new Error(`Sentinos Node SDK requires absolute URLs; got: ${full}`);
  }

  const url = new URL(full);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.defaultHeaders || {})) {
    if (v === undefined) continue;
    headers[k] = v;
  }
  for (const [k, v] of Object.entries(opts.headers || {})) {
    if (v === undefined) {
      delete headers[k];
      continue;
    }
    headers[k] = v;
  }

  const hasBody = opts.body !== undefined;
  if (hasBody && !headers["content-type"]) headers["content-type"] = "application/json";
  if (!headers["accept"]) headers["accept"] = "application/json";

  const timeoutMs = opts.timeoutMs ?? opts.defaultTimeoutMs;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(new Error("request timeout")), timeoutMs);

  try {
    const res = await opts.fetchImpl(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal ?? ctrl.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const raw = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

    if (!res.ok) {
      const msg =
        raw && typeof raw === "object" && raw && "error" in (raw as any) ? String((raw as any).error) : `HTTP ${res.status}`;
      throw new ApiError(msg, res.status, raw);
    }

    return raw as T;
  } finally {
    clearTimeout(timeout);
  }
}
