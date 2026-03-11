import { ServiceClient, cleanQuery } from "../base.js";
import type {
  ChronosComplianceReport,
  ChronosQueryResponse,
  ChronosSnapshot,
} from "../types.js";
import type { SentinosClient } from "../client.js";

export class ChronosClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "chronos", tenantId);
  }

  async createSnapshot(body: {
    tenant_id?: string;
    anchors: string[];
    depth?: number;
    valid_time?: string;
    include_decision_traces?: boolean;
    trace_filter?: Record<string, unknown>;
    tenantId?: string;
    orgId?: string;
  }): Promise<Record<string, unknown>> {
    const tenantId = body.tenant_id ?? this.requireTenant(body.tenantId, body.orgId);
    return this.request("/v1/chronos/snapshots", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        anchors: body.anchors,
        depth: body.depth,
        valid_time: body.valid_time,
        include_decision_traces: body.include_decision_traces,
        trace_filter: body.trace_filter,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getSnapshot(snapshotId: string, scope?: { tenantId?: string; orgId?: string }): Promise<ChronosSnapshot> {
    return this.request(`/v1/chronos/snapshots/${encodeURIComponent(snapshotId)}`, scope);
  }

  async getEntity(nodeId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/entities/${encodeURIComponent(nodeId)}`, scope);
  }

  async mergeEntity(nodeId: string, targetNodeId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/entities/${encodeURIComponent(nodeId)}/merge`, {
      method: "POST",
      body: { target_node_id: targetNodeId },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async suggestEntity(
    body: { alias: string; canonical_node_id: string; confidence?: number; provenance?: unknown; tenantId?: string; orgId?: string },
  ) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<{ ok: true }>("/v1/entities/suggest", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async provenance(id: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/provenance/${encodeURIComponent(id)}`, scope);
  }

  async invalidateSnapshot(snapshotId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/snapshots/${encodeURIComponent(snapshotId)}/invalidate`, {
      method: "POST",
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async query(body: {
    tenant_id?: string;
    query: string;
    depth?: number;
    limit?: number;
    include_decision_traces?: boolean;
    valid_time?: string;
    tenantId?: string;
    orgId?: string;
  }): Promise<ChronosQueryResponse> {
    const tenantId = body.tenant_id ?? this.requireTenant(body.tenantId, body.orgId);
    return this.request("/v1/chronos/query", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        query: body.query,
        depth: body.depth,
        limit: body.limit,
        include_decision_traces: body.include_decision_traces,
        valid_time: body.valid_time,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async ingestTraces(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/ingest/traces", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async observabilityTraces(params: { from?: string; to?: string; tool?: string; decision?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/chronos/observability/traces", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async analyzeTraces(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<Record<string, unknown>>("/v1/chronos/observability/traces/analyze", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async observabilityAnomalies(params: { from?: string; to?: string; limit?: number; threshold?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/chronos/observability/anomalies", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async anomalyStats(params: { from?: string; to?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/chronos/observability/anomalies/stats", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async observabilityCompliance(params: { from?: string; to?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/chronos/observability/compliance", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async createComplianceReport(body: Record<string, unknown> & { tenantId?: string; orgId?: string }): Promise<ChronosComplianceReport> {
    const { tenantId, orgId, ...payload } = body;
    return this.request("/v1/chronos/observability/compliance/report", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async observabilityPatterns(params: { from?: string; to?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/chronos/observability/patterns", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async entityRisk(id: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/chronos/observability/entities/${encodeURIComponent(id)}/risk`, scope);
  }

  async getIngestStatus(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/connectors/health", scope);
  }

  async ingestEvent(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/ingest", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async ingestConnectorEvent(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    const sourceId = String(body.source_id ?? body.source ?? "").trim();
    if (!sourceId) {
      throw new Error("source_id is required for connector ingest");
    }
    const { source_id: _sourceId, source: _source, ...payload } = body;
    return this.request<Record<string, unknown>>(`/v1/chronos/connectors/${encodeURIComponent(sourceId)}/ingest`, {
      method: "POST",
      body: payload,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async reprocess(body?: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/reprocess", {
      method: "POST",
      body: body || {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async connectorHealth(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/connectors/health", scope);
  }

  async status(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/status", scope);
  }

  async coordinate(
    body: {
      tenant_id?: string;
      query?: string;
      anchors?: string[];
      constraints?: {
        max_latency_ms?: number;
        max_cost_usd?: number;
        prefer_cached?: boolean;
        require_fresh?: boolean;
        min_confidence?: number;
        context_window_tokens?: number;
      };
      tenantId?: string;
      orgId?: string;
    },
  ) {
    const tenantId = body.tenant_id ?? this.requireTenant(body.tenantId, body.orgId);
    return this.request<Record<string, unknown>>("/v1/chronos/coordinate", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        query: body.query,
        anchors: body.anchors,
        constraints: body.constraints,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getSourceHealth(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/sources/health", scope);
  }

  async getConnectorSources(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/connectors/sources", scope);
  }

  async updateConnectorSourceConfig(
    sourceId: string,
    body: Record<string, unknown>,
    scope?: { tenantId?: string; orgId?: string },
  ) {
    return this.request<Record<string, unknown>>(`/v1/chronos/connectors/${encodeURIComponent(sourceId)}/config`, {
      method: "PATCH",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async rotateConnectorSourceCredential(
    sourceId: string,
    body: { credential_ref: string; note?: string; metadata?: Record<string, unknown> },
    scope?: { tenantId?: string; orgId?: string },
  ) {
    return this.request<Record<string, unknown>>(`/v1/chronos/connectors/${encodeURIComponent(sourceId)}/rotate-credential`, {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async filterSignal(
    body: {
      tenant_id?: string;
      decision_pattern: string;
      time_window?: { from?: string; to?: string };
      tenantId?: string;
      orgId?: string;
    },
  ) {
    const tenantId = body.tenant_id ?? this.requireTenant(body.tenantId, body.orgId);
    return this.request<Record<string, unknown>>("/v1/chronos/filter/signal", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        decision_pattern: body.decision_pattern,
        time_window: body.time_window,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getSignalClassification(nodeId: string, pattern?: string, scope?: { tenantId?: string; orgId?: string }) {
    const query = pattern ? { pattern } : undefined;
    return this.request<Record<string, unknown>>(`/v1/chronos/filter/signal/${encodeURIComponent(nodeId)}`, {
      query,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async resolveFacts(
    body: { tenant_id?: string; entity_id: string; property?: string; tenantId?: string; orgId?: string },
  ) {
    const tenantId = body.tenant_id ?? this.requireTenant(body.tenantId, body.orgId);
    return this.request<Record<string, unknown>>("/v1/chronos/resolve/facts", {
      method: "POST",
      body: {
        tenant_id: tenantId,
        entity_id: body.entity_id,
        property: body.property,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getConflicts(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/conflicts", scope);
  }

  async updateSourceCredibility(
    sourceId: string,
    body: { credibility_score: number; metadata?: Record<string, unknown> },
    scope?: { tenantId?: string; orgId?: string },
  ) {
    return this.request<Record<string, unknown>>(`/v1/chronos/sources/${encodeURIComponent(sourceId)}/credibility`, {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async queryAsOfValid(nodeIds: string[], asOf: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/temporal/as-of-valid", {
      query: { node_ids: nodeIds.join(","), as_of: asOf },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async queryAsOfTx(nodeIds: string[], asOf: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/chronos/temporal/as-of-tx", {
      query: { node_ids: nodeIds.join(","), as_of: asOf },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async getNodeHistory(nodeId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/chronos/temporal/history/${encodeURIComponent(nodeId)}`, scope);
  }

  async dashboardQuery(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/dashboard/query", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }
}
