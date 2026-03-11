export type AuditSourceService = "kernel" | "arbiter" | "chronos" | "controlplane" | "meshgate";

export type AuditCategory =
  | "identity"
  | "policy"
  | "runtime"
  | "privacy"
  | "incident"
  | "integration"
  | "compliance"
  | "org_admin";

export type AuditOutcome = "ALLOW" | "DENY" | "ESCALATE" | "SHADOW" | "SUCCESS" | "FAILURE" | "UNKNOWN";
export type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AuditRetentionClass = "HOT_90D" | "COMPLIANCE_ARCHIVE";

export interface AuditActor {
  actor_type: "human" | "service" | "workforce" | "system" | "unknown";
  actor_id?: string;
  actor_label?: string;
}

export interface AuditTarget {
  resource_type: string;
  resource_id?: string;
}

export interface AuditContext {
  trace_id?: string;
  session_id?: string;
  request_id?: string;
  ip?: string;
  user_agent?: string;
}

export interface AuditChange {
  field: string;
  before?: unknown;
  after?: unknown;
  redacted?: boolean;
}

export interface AuditEvent {
  event_id: string;
  org_id: string;
  tenant_id?: string;
  source_service: AuditSourceService;
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  actor: AuditActor;
  target: AuditTarget;
  context?: AuditContext;
  changes?: AuditChange[];
  attributes?: Record<string, unknown>;
  tags?: string[];
  occurred_at: string;
  ingested_at: string;
  retention_class: AuditRetentionClass;
  notable?: boolean;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  q?: string;
  category?: AuditCategory;
  action?: string;
  actor?: string;
  resource_type?: string;
  outcome?: AuditOutcome;
  source_service?: AuditSourceService;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

export interface AuditQueryResult {
  events: AuditEvent[];
  next_cursor?: string;
}

export interface AuditSavedView {
  view_id: string;
  org_id: string;
  name: string;
  is_default: boolean;
  query: AuditQuery;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditNotableRule {
  rule_id: string;
  org_id: string;
  name: string;
  enabled: boolean;
  definition: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
