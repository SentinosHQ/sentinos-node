import { ServiceClient, cleanQuery, csvOrUndefined } from "../base.js";
import type { MarketplaceInstall, MarketplacePack } from "../types.js";
import type { SentinosClient } from "../client.js";

export class MarketplaceClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "arbiter", tenantId);
  }

  async listPacks(params: { search?: string; tags?: string[]; verified_only?: boolean; tenantId?: string; orgId?: string } = {}) {
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

  async getPack(packId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<MarketplacePack>(`/v1/marketplace/packs/${encodeURIComponent(packId)}`, scope);
  }

  async installPack(
    packId: string,
    body: { target_status?: "staging" | "prod"; skip_simulation?: boolean; trace_limit?: number; tenantId?: string; orgId?: string }
  ) {
    return this.request<{ install_id: string; simulation_job_ids: string[] }>(`/v1/marketplace/packs/${encodeURIComponent(packId)}/install`, {
      method: "POST",
      body: {
        target_status: body.target_status,
        skip_simulation: body.skip_simulation,
        trace_limit: body.trace_limit,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async listInstalls(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ installs: MarketplaceInstall[] }>("/v1/marketplace/installs", scope);
  }

  async uninstallPack(packId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/marketplace/installs/${encodeURIComponent(packId)}`, {
      method: "DELETE",
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }
}
