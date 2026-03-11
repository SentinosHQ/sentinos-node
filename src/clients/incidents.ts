import { ServiceClient, cleanQuery } from "../base.js";
import type { IncidentRecord } from "../types.js";
import type { SentinosClient } from "../client.js";

export class IncidentsClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "kernel", tenantId);
  }

  async list(params: { status?: string; severity?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ incidents: IncidentRecord[] }>("/v1/incidents", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async create(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<IncidentRecord>("/v1/incidents", { method: "POST", body: payload, tenantId, orgId });
  }

  async get(incidentId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ incident: IncidentRecord; timeline: Array<Record<string, unknown>> }>(
      `/v1/incidents/${encodeURIComponent(incidentId)}`,
      scope
    );
  }

  async update(incidentId: string, body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<IncidentRecord>(`/v1/incidents/${encodeURIComponent(incidentId)}`, {
      method: "PUT",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async resolve(incidentId: string, note?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<IncidentRecord>(`/v1/incidents/${encodeURIComponent(incidentId)}/resolve`, {
      method: "POST",
      body: note ? { note } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }
}
