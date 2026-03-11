import { ServiceClient, cleanQuery } from "../base.js";
import type {
  BillingEntitlements,
  BillingUsageEvent,
  BillingUsageSummary,
  DecisionTrace,
  KernelExecuteResponse,
  NotificationChannel,
  NotificationTestResult,
  NotificationValidationResult,
  TraceExportJob,
  TraceLedgerVerification,
  TracePrivacyPolicy,
  TracePrivacyScanResult,
  TraceReplayResponse,
  TraceRetentionEnforcementRun,
  TraceRetentionPolicy,
  TraceSearchResult,
} from "../types.js";
import type { SentinosClient } from "../client.js";

export class KernelClient extends ServiceClient {
  constructor(client: SentinosClient, tenantId?: string) {
    super(client, "kernel", tenantId);
  }

  async execute(body: Record<string, unknown>): Promise<KernelExecuteResponse> {
    return this.request("/v1/kernel/execute", { method: "POST", body });
  }

  async grpcExecute(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("/v1/kernel/grpc/execute", { method: "POST", body });
  }

  async getTrace(traceId: string): Promise<DecisionTrace> {
    return this.request(`/v1/trace/${encodeURIComponent(traceId)}`);
  }

  async traceSearch(params: {
    agent_id?: string;
    session_id?: string;
    policy_id?: string;
    decision?: string;
    data_class?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
    tenantId?: string;
    orgId?: string;
  } = {}): Promise<TraceSearchResult> {
    return this.request("/v1/trace/search", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async verifyTrace(traceId: string): Promise<Record<string, unknown>> {
    return this.request(`/v1/trace/${encodeURIComponent(traceId)}/verify`);
  }

  async getTraceLedger(traceId: string): Promise<TraceLedgerVerification> {
    return this.request(`/v1/trace/${encodeURIComponent(traceId)}/ledger`);
  }

  async replayTrace(
    traceId: string,
    body?: { policy_keys?: string[]; include_explain?: boolean; tenantId?: string; orgId?: string }
  ): Promise<TraceReplayResponse> {
    return this.request(`/v1/trace/${encodeURIComponent(traceId)}/replay`, {
      method: "POST",
      body: body ? { policy_keys: body.policy_keys, include_explain: body.include_explain } : {},
      tenantId: body?.tenantId,
      orgId: body?.orgId,
    });
  }

  async getSession(sessionId: string): Promise<{ tenant_id: string; session_id: string; state: unknown }> {
    return this.request(`/v1/kernel/session/${encodeURIComponent(sessionId)}`);
  }

  async appendSessionEvent(
    sessionId: string,
    event: { type: string; payload?: unknown; timestamp?: string; tenantId?: string; orgId?: string }
  ): Promise<{ ok: true }> {
    return this.request(`/v1/kernel/session/${encodeURIComponent(sessionId)}/event`, {
      method: "POST",
      body: { type: event.type, payload: event.payload, timestamp: event.timestamp },
      tenantId: event.tenantId,
      orgId: event.orgId,
    });
  }

  async listAutonomySessions(params: {
    status?: string;
    limit?: number;
    tenantId?: string;
    orgId?: string;
  } = {}): Promise<{ sessions: Array<Record<string, unknown>> }> {
    return this.request("/v1/kernel/autonomy/sessions", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async createAutonomySession(body: {
    agent_id: string;
    session_id?: string;
    risk_budget_snapshot?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tenantId?: string;
    orgId?: string;
  }): Promise<{ session: Record<string, unknown> }> {
    return this.request("/v1/kernel/autonomy/sessions", {
      method: "POST",
      body: {
        agent_id: body.agent_id,
        session_id: body.session_id,
        risk_budget_snapshot: body.risk_budget_snapshot,
        metadata: body.metadata,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getAutonomySession(sessionId: string, scope?: { tenantId?: string; orgId?: string }): Promise<{ session: Record<string, unknown> }> {
    return this.request(`/v1/kernel/autonomy/sessions/${encodeURIComponent(sessionId)}`, scope);
  }

  async patchAutonomySession(
    sessionId: string,
    body: {
      risk_budget_snapshot?: Record<string, unknown>;
      budget_violation_reason?: string;
      metadata?: Record<string, unknown>;
      tenantId?: string;
      orgId?: string;
    }
  ): Promise<{ session: Record<string, unknown> }> {
    return this.request(`/v1/kernel/autonomy/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      body: {
        risk_budget_snapshot: body.risk_budget_snapshot,
        budget_violation_reason: body.budget_violation_reason,
        metadata: body.metadata,
      },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async pauseAutonomySession(sessionId: string, reason?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request(`/v1/kernel/autonomy/sessions/${encodeURIComponent(sessionId)}/pause`, {
      method: "POST",
      body: reason ? { reason } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async resumeAutonomySession(sessionId: string, reason?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request(`/v1/kernel/autonomy/sessions/${encodeURIComponent(sessionId)}/resume`, {
      method: "POST",
      body: reason ? { reason } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async terminateAutonomySession(sessionId: string, reason?: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request(`/v1/kernel/autonomy/sessions/${encodeURIComponent(sessionId)}/terminate`, {
      method: "POST",
      body: reason ? { reason } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listEscalations(params: { status?: string; session_id?: string; trace_id?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ escalations: Array<Record<string, unknown>> }>("/v1/kernel/escalations", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getEscalation(escalationId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ escalation: Record<string, unknown> }>(`/v1/kernel/escalations/${encodeURIComponent(escalationId)}`, scope);
  }

  async resolveEscalation(
    escalationId: string,
    status: "APPROVED" | "DENIED",
    scope?: { tenantId?: string; orgId?: string }
  ) {
    return this.request<{ ok: true }>(`/v1/kernel/escalations/${encodeURIComponent(escalationId)}/resolve`, {
      method: "POST",
      body: { status },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async createTraceExportJob(body: {
    agent_id?: string;
    policy_id?: string;
    decision?: string;
    data_class?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";
    from?: string;
    to?: string;
    limit?: number;
    tenantId?: string;
    orgId?: string;
  }): Promise<TraceExportJob> {
    return this.request("/v1/trace/export", {
      method: "POST",
      body: cleanQuery(body),
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async getTraceExportJob(jobId: string, scope?: { tenantId?: string; orgId?: string }): Promise<TraceExportJob> {
    return this.request(`/v1/trace/export/job/${encodeURIComponent(jobId)}`, scope);
  }

  async getTraceRetentionPolicy(scope?: { tenantId?: string; orgId?: string }): Promise<TraceRetentionPolicy> {
    return this.request("/v1/trace/retention", scope);
  }

  async updateTraceRetentionPolicy(body: {
    trace_days?: number;
    export_days?: number;
    ledger_days?: number;
    tenantId?: string;
    orgId?: string;
  }): Promise<TraceRetentionPolicy> {
    return this.request("/v1/trace/retention", {
      method: "PATCH",
      body: cleanQuery(body),
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async enforceTraceRetention(dryRun: boolean, scope?: { tenantId?: string; orgId?: string }): Promise<TraceRetentionEnforcementRun> {
    return this.request("/v1/trace/retention/enforce", {
      method: "POST",
      body: { dry_run: dryRun },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async getTracePrivacyPolicy(scope?: { tenantId?: string; orgId?: string }): Promise<TracePrivacyPolicy> {
    return this.request("/v1/trace/privacy/policy", scope);
  }

  async updateTracePrivacyPolicy(body: Record<string, unknown> & { tenantId?: string; orgId?: string }): Promise<TracePrivacyPolicy> {
    const { tenantId, orgId, ...payload } = body;
    return this.request("/v1/trace/privacy/policy", {
      method: "PATCH",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async scanTracePrivacyPayload(body: Record<string, unknown> & { tenantId?: string; orgId?: string }): Promise<TracePrivacyScanResult> {
    const { tenantId, orgId, ...payload } = body;
    return this.request("/v1/trace/privacy/scan", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async listDistributedTraceSummaries(limit = 50, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ traces: Array<Record<string, unknown>> }>("/v1/trace/distributed", {
      query: { limit },
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async getRuntimeMetrics(scope?: { tenantId?: string; orgId?: string }): Promise<Record<string, unknown>> {
    return this.request("/v1/kernel/metrics/runtime", scope);
  }

  async purgeWasmCache(scope?: { tenantId?: string; orgId?: string }): Promise<{ ok: true }> {
    return this.request("/v1/kernel/runtime/wasm/cache/purge", { method: "POST", body: {}, ...scope });
  }

  async listApiKeys(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ keys: Array<Record<string, unknown>> }>("/v1/kernel/api-keys", scope);
  }

  async createApiKey(body: { label: string; scopes?: string[]; expires_at?: string; tenantId?: string; orgId?: string }) {
    return this.request<{ key: Record<string, unknown>; secret: string }>("/v1/kernel/api-keys", {
      method: "POST",
      body: { label: body.label, scopes: body.scopes, expires_at: body.expires_at },
      tenantId: body.tenantId,
      orgId: body.orgId,
    });
  }

  async revokeApiKey(keyId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/kernel/api-keys/${encodeURIComponent(keyId)}/revoke`, {
      method: "POST",
      body: {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listNotificationChannels(params: { kind?: string; limit?: number; tenantId?: string; orgId?: string } = {}) {
    return this.request<{ channels: NotificationChannel[] }>("/v1/integrations/channels", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getNotificationChannel(channelId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<NotificationChannel>(`/v1/integrations/channels/${encodeURIComponent(channelId)}`, scope);
  }

  async createNotificationChannel(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<NotificationChannel>("/v1/integrations/channels", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async updateNotificationChannel(channelId: string, body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<NotificationChannel>(`/v1/integrations/channels/${encodeURIComponent(channelId)}`, {
      method: "PUT",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async deleteNotificationChannel(channelId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<{ ok: true }>(`/v1/integrations/channels/${encodeURIComponent(channelId)}`, {
      method: "DELETE",
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async testNotificationChannel(
    channelId: string,
    message?: string,
    scope?: { tenantId?: string; orgId?: string }
  ): Promise<NotificationTestResult> {
    return this.request(`/v1/integrations/channels/${encodeURIComponent(channelId)}/test`, {
      method: "POST",
      body: message ? { message } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async validateNotificationChannel(body: Record<string, unknown> & { tenantId?: string; orgId?: string }): Promise<NotificationValidationResult> {
    const { tenantId, orgId, ...payload } = body;
    return this.request("/v1/integrations/channels/validate", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async getIntegrationsHealth(scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/integrations/health", scope);
  }

  async exportDatadog(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<Record<string, unknown>>("/v1/integrations/datadog/export", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async exportSIEM(body: Record<string, unknown> & { tenantId?: string; orgId?: string }) {
    const { tenantId, orgId, ...payload } = body;
    return this.request<Record<string, unknown>>("/v1/integrations/siem/export", {
      method: "POST",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async getSOC2Report(params: { from?: string; to?: string; tenantId?: string; orgId?: string } = {}) {
    return this.request<Record<string, unknown>>("/v1/compliance/reports/soc2", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getComplianceControlReport(
    params: { from?: string; to?: string; control_id?: string; tenantId?: string; orgId?: string } = {}
  ) {
    return this.request<Record<string, unknown>>("/v1/compliance/reports/control", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async complianceControlEvidenceReport(
    params: { framework?: "SOC2" | "HIPAA" | "FEDRAMP" | "ALL"; from?: string; to?: string; tenantId?: string; orgId?: string } = {}
  ) {
    return this.request<Record<string, unknown>>("/v1/compliance/evidence/controls", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getBillingEntitlements(scope?: { tenantId?: string; orgId?: string }): Promise<BillingEntitlements> {
    return this.request("/v1/kernel/billing/entitlements", scope);
  }

  async patchBillingEntitlements(body: Record<string, unknown> & { tenantId?: string; orgId?: string }): Promise<BillingEntitlements> {
    const { tenantId, orgId, ...payload } = body;
    return this.request("/v1/kernel/billing/entitlements", {
      method: "PATCH",
      body: payload,
      tenantId,
      orgId,
    });
  }

  async getBillingUsageSummary(periodAt?: string, scope?: { tenantId?: string; orgId?: string }): Promise<BillingUsageSummary> {
    return this.request("/v1/kernel/billing/usage/summary", {
      query: periodAt ? { period_at: periodAt } : {},
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async listBillingUsageEvents(params: { period_at?: string; limit?: number; tenantId?: string; orgId?: string } = {}): Promise<{ events: BillingUsageEvent[] }> {
    return this.request("/v1/kernel/billing/usage/events", {
      query: cleanQuery(params),
      tenantId: params.tenantId,
      orgId: params.orgId,
    });
  }

  async getChronosIngest(ingestId: string, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>(`/v1/kernel/chronos/ingest/${encodeURIComponent(ingestId)}`, scope);
  }

  async jsonrpc(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/kernel/jsonrpc", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }

  async mcp(body: Record<string, unknown>, scope?: { tenantId?: string; orgId?: string }) {
    return this.request<Record<string, unknown>>("/v1/kernel/mcp", {
      method: "POST",
      body,
      tenantId: scope?.tenantId,
      orgId: scope?.orgId,
    });
  }
}
