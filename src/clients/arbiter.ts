import { ServiceClient, cleanQuery, csvOrUndefined } from "../base.js";
import type { MarketplacePack } from "../types.js";
import type { SentinosClient } from "../client.js";

export class ArbiterClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "arbiter", tenantId);
  }

  async listPolicies(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ policies: Array<Record<string, unknown>> }>("/v1/arbitr/policies", scope);
  }

  async activePolicies(params: {
    tenant_id?: string;
    tool: string;
    env?: string;
    tag?: string;
    tenantId?: string;
    orgId?: string;
  }) {
    const tenantId = params.tenant_id ?? this.requireTenant(params.tenantId, params.orgId);
    return this.request<{ policy_keys: string[] }>("/v1/arbitr/policies/active", {
      query: cleanQuery({ tenant_id: tenantId, tool: params.tool, env: params.env ?? "prod", tag: params.tag }),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async upsertPolicy(body: { metadata: Record<string, unknown>; rego: string; status?: string; tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>("/v1/arbitr/policies", {
      method: "POST",
      body: { metadata: body.metadata, rego: body.rego, status: body.status },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async promotePolicy(
    policyId: string,
    body: { version: string; status: "draft" | "staging" | "prod"; simulation_job_id?: string; tenantId?: string; orgId?: string }
  ) {
    return this.request<{ ok: true }>(`/v1/arbitr/policies/${encodeURIComponent(policyId)}/promote`, {
      method: "POST",
      body: { version: body.version, status: body.status, simulation_job_id: body.simulation_job_id },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async evaluate(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/arbitr/evaluate", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async compile(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/arbitr/compile", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async verify(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/arbitr/verify", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async simulate(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ job_id: string }>("/v1/arbitr/simulate", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async getSimulationJob(jobId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/arbitr/simulate/${encodeURIComponent(jobId)}`, scope);
  }

  async getTenantConfig(tenantId?: string, orgId?: string) {
    const resolved = this.requireTenant(tenantId, orgId);
    return this.request<Record<string, unknown>>(`/v1/arbitr/tenants/${encodeURIComponent(resolved)}`, {
      tenantId,
      orgId,
    });
  }

  async upsertTenantConfig(config: Record<string, unknown>, tenantId?: string, orgId?: string) {
    const resolved = this.requireTenant(tenantId, orgId);
    return this.request<{ ok: true }>(`/v1/arbitr/tenants/${encodeURIComponent(resolved)}`, {
      method: "PUT",
      body: { config },
      tenantId,
      orgId,
    });
  }

  async getPolicyBundle(policyId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/arbitr/policies/${encodeURIComponent(policyId)}/bundle`, scope);
  }

  async governanceDashboard(params: { from?: string; to?: string; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/arbitr/governance/dashboard", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async governanceViolations(params: { from?: string; to?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ violations: Array<Record<string, unknown>> }>("/v1/arbitr/governance/violations", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async governanceReport(body: { from?: string; to?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/arbitr/governance/reports", {
      method: "POST",
      body: cleanQuery(body),
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async dashboardQuery(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/dashboard/query", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listMarketplacePacks(params: { search?: string; tags?: string[]; verified_only?: boolean; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ packs: MarketplacePack[] }>("/v1/marketplace/packs", {
      query: cleanQuery({
        search: params.search,
        tags: csvOrUndefined(params.tags),
        verified_only: params.verified_only,
      }),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getMarketplacePack(packId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<MarketplacePack>(`/v1/marketplace/packs/${encodeURIComponent(packId)}`, scope);
  }

  async createMarketplacePack(
    body: {
      pack_id: string;
      name: string;
      version: string;
      description?: string;
      author?: string;
      visibility_scope?: "TENANT" | "COMMUNITY";
      tags?: string[];
      policies: Array<{ policy_id: string; rego: string; metadata: Record<string, unknown> }>;
      tenantId?: string;
      orgId?: string;
    },
  ) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<MarketplacePack>("/v1/marketplace/packs", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async updateMarketplacePack(
    packId: string,
    body: {
      name: string;
      version: string;
      description?: string;
      author?: string;
      visibility_scope?: "TENANT" | "COMMUNITY";
      tags?: string[];
      policies: Array<{ policy_id: string; rego: string; metadata: Record<string, unknown> }>;
      tenantId?: string;
      orgId?: string;
    },
  ) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<MarketplacePack>(`/v1/marketplace/packs/${encodeURIComponent(packId)}`, {
      method: "PUT",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async publishMarketplacePack(
    packId: string,
    body: { visibility_scope?: "TENANT" | "COMMUNITY"; tenantId?: string; orgId?: string } = {},
  ) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<MarketplacePack>(`/v1/marketplace/packs/${encodeURIComponent(packId)}/publish`, {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async listMarketplaceReviewQueue(limit = 200, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ packs: MarketplacePack[] }>("/v1/marketplace/review-queue", {
      query: { limit },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async reviewMarketplacePack(
    packId: string,
    body: { decision: "APPROVE" | "REJECT"; trust_tier?: "COMMUNITY" | "VERIFIED"; notes?: string; reviewer?: string; tenantId?: string; orgId?: string },
  ) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<MarketplacePack>(`/v1/marketplace/packs/${encodeURIComponent(packId)}/review`, {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }
}
