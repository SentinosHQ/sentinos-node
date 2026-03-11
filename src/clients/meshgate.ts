import { ServiceClient, csvOrUndefined } from "../base.js";
import type { A2AHandoffLineageResponse, A2AHandoffReceipt, A2ATrustScore } from "../types.js";
import type { SentinosClient } from "../client.js";

export class MeshgateClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "meshgate", tenantId);
  }

  async getHandoffReceipt(handoffId: string): Promise<A2AHandoffReceipt> {
    return this.request(`/v1/a2a/handoffs/${encodeURIComponent(handoffId)}/receipt`);
  }

  async getHandoffLineage(handoffId: string): Promise<A2AHandoffLineageResponse> {
    return this.request(`/v1/a2a/handoffs/${encodeURIComponent(handoffId)}/lineage`);
  }

  async verifyHandoffReceipt(handoffId: string): Promise<Record<string, unknown>> {
    return this.request(`/v1/a2a/handoffs/${encodeURIComponent(handoffId)}/verify`);
  }

  async listTrustScores(params: { agents?: string[]; limit?: number } = {}): Promise<{ scores: A2ATrustScore[] }> {
    return this.request("/v1/a2a/trust-scores", {
      query: { agents: csvOrUndefined(params.agents), limit: params.limit },
    });
  }

  async authorizeHandoff(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/v1/a2a/handoffs/authorize", { method: "POST", body });
  }

  async forwardHandoff(body: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("/v1/a2a/handoffs/forward", { method: "POST", body });
  }
}
