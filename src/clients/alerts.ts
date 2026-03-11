import { ServiceClient, cleanQuery } from "../base.js";
import type { AlertRecord } from "../types.js";
import type { SentinosClient } from "../client.js";

export class AlertsClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "kernel", tenantId);
  }

  async createRule(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<Record<string, unknown>>("/v1/alerts/rules", { method: "POST", body: payload, tenantId, orgId });
  }

  async listRules(params: { enabled?: boolean; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ rules: Array<Record<string, unknown>> }>("/v1/alerts/rules", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getRule(ruleId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/alerts/rules/${encodeURIComponent(ruleId)}`, scope);
  }

  async updateRule(ruleId: string, body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<Record<string, unknown>>(`/v1/alerts/rules/${encodeURIComponent(ruleId)}`, {
      method: "PUT",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async deleteRule(ruleId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/alerts/rules/${encodeURIComponent(ruleId)}`, {
      method: "DELETE",
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async list(params: {
    status?: string;
    severity?: string;
    limit?: number;
    cursor?: string;
    tenantId?: string;
    orgId?: string;
  } = {}): Promise<{ alerts: AlertRecord[]; next_cursor?: string }> {
    return this.request("/v1/alerts", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async get(alertId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<AlertRecord>(`/v1/alerts/${encodeURIComponent(alertId)}`, scope);
  }

  async acknowledge(alertId: string, note?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<AlertRecord>(`/v1/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: "POST",
      body: note ? { note } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async resolve(alertId: string, note?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<AlertRecord>(`/v1/alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: "POST",
      body: note ? { note } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async escalate(alertId: string, escalatedTo: string, note?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<AlertRecord>(`/v1/alerts/${encodeURIComponent(alertId)}/escalate`, {
      method: "POST",
      body: { escalated_to: escalatedTo, note },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listAnomalies(params: { status?: string; type?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ anomalies: Array<Record<string, unknown>> }>("/v1/anomalies", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getAnomaly(anomalyId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/anomalies/${encodeURIComponent(anomalyId)}`, scope);
  }

  async investigateAnomaly(
    anomalyId: string,
    body: { notes?: string; false_positive?: boolean; tenantId?: string; orgId?: string } = {}
  ) {
    return this.request<Record<string, unknown>>(`/v1/anomalies/${encodeURIComponent(anomalyId)}/investigate`, {
      method: "POST",
      body: { notes: body.notes, false_positive: body.false_positive },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }
}
