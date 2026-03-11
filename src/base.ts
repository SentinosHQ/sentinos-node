import type { RequestJsonOptions, ServiceName } from "./http.js";
import type { SentinosClient } from "./client.js";
import type { WorkforceAccessPolicy } from "./types.js";

export function resolveScopeTenantId(
  defaultTenantId?: string,
  tenantId?: string | null,
  orgId?: string | null
): string | undefined {
  const normalizedTenant = tenantId?.trim() || undefined;
  const normalizedOrg = orgId?.trim() || undefined;
  if (normalizedTenant && normalizedOrg && normalizedTenant !== normalizedOrg) {
    throw new Error("tenantId and orgId must match when both are provided");
  }
  return normalizedTenant ?? normalizedOrg ?? defaultTenantId;
}

export function requireTenantId(
  defaultTenantId?: string,
  tenantId?: string | null,
  orgId?: string | null
): string {
  const value = resolveScopeTenantId(defaultTenantId, tenantId, orgId);
  if (!value) {
    throw new Error("Sentinos tenant/org id is required for this operation");
  }
  return value;
}

export function csvOrUndefined(values?: Array<string | number | null | undefined> | null): string | undefined {
  if (!values || !values.length) return undefined;
  const normalized = values
    .map((value) => (value === undefined || value === null ? "" : String(value).trim()))
    .filter(Boolean);
  return normalized.length ? normalized.join(",") : undefined;
}

export function cleanQuery<T extends Record<string, unknown>>(query: T): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      cleaned[key] = value.join(",");
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function normalizeWorkforcePolicy(raw: WorkforceAccessPolicy): WorkforceAccessPolicy {
  return {
    ...raw,
    allowed_idps: Array.isArray(raw.allowed_idps)
      ? raw.allowed_idps.filter((value: unknown): value is string => typeof value === "string")
      : [],
    allowed_email_domains: Array.isArray(raw.allowed_email_domains)
      ? raw.allowed_email_domains.filter((value: unknown): value is string => typeof value === "string")
      : [],
    required_group_rules_json:
      raw.required_group_rules_json && typeof raw.required_group_rules_json === "object" ? raw.required_group_rules_json : [],
    required_endpoint_signals_json:
      raw.required_endpoint_signals_json && typeof raw.required_endpoint_signals_json === "object"
        ? raw.required_endpoint_signals_json
        : {},
  };
}

export abstract class ServiceClient {
  protected constructor(
    protected readonly client: SentinosClient,
    protected readonly service: ServiceName,
    protected readonly defaultTenantId?: string
  ) {}

  protected request<T>(
    path: string,
    opts?: RequestJsonOptions & {
      tenantId?: string | null;
      orgId?: string | null;
    }
  ): Promise<T> {
    const tenantId = resolveScopeTenantId(this.defaultTenantId, opts?.tenantId, opts?.orgId);
    return this.client.requestJson<T>(this.service, path, {
      ...(opts || {}),
      tenantId,
    });
  }

  protected requireTenant(tenantId?: string | null, orgId?: string | null): string {
    return requireTenantId(this.defaultTenantId, tenantId, orgId);
  }
}
