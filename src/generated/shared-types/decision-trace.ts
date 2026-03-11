export type Decision = "ALLOW" | "DENY" | "ESCALATE" | "SHADOW";

export type DecisionTraceSchemaVersion = "decision-trace.v1";

export interface DecisionTraceIntent {
  type: string;
  tool: string;
  args?: Record<string, unknown>;
}

export interface DecisionTraceEvidenceItem {
  rule?: string;
  snippet?: string;
  hit?: boolean;
  confidence?: number; // 0..1
  [k: string]: unknown;
}

export interface DecisionTracePolicyEvaluation {
  policy_id: string;
  policy_version?: string;
  decision: Decision;
  reason?: string;
  evidence?: DecisionTraceEvidenceItem[];
  explain_plan?: Record<string, unknown>;
}

export interface DecisionTraceSignatures {
  signed_by?: string;
  key_id?: string;
  alg?: string;
  sig?: string;
  [k: string]: unknown;
}

export interface DecisionTracePrivacyRedactionEvent {
  redaction_rule_id: string;
  field_path: string;
  match_type: string;
  before_hash: string;
  after_hash: string;
  reason: string;
}

export interface DecisionTracePrivacy {
  policy_version?: string;
  write_redaction_applied?: boolean;
  seal_applied?: boolean;
  seal_mode?: string;
  events?: DecisionTracePrivacyRedactionEvent[];
}

export interface GarbageCanContext {
  problems_present?: string[];
  solutions_available?: string[];
  participants?: string[];
  choice_opportunity?: string;
}

export interface DecisionReasoning {
  captured_at_decision_time?: boolean;
  pattern_recognized?: string;
  satisficing_threshold?: number; // 0..1
  alternatives_considered?: number;
  garbage_can_context?: GarbageCanContext;
}

export interface OrganizationalContext {
  system_state?: string;
  variation_type?: string;
  external_factors?: string[];
}

export interface DecisionTraceV1 {
  schema_version: DecisionTraceSchemaVersion;

  trace_id: string;
  timestamp: string;
  tenant_id: string;
  data_class?: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";

  agent_id?: string;
  session_id?: string;
  autonomy_session_id?: string;

  // Canonical tool invocation shape.
  intent: DecisionTraceIntent;

  // Optional alias for compatibility with external producers.
  tool_call?: DecisionTraceIntent;

  // Chronos linkage. Present once Chronos snapshot storage exists.
  context_snapshot_id?: string | null;

  // Transitional: inlined snapshot payload (may be large; prefer snapshot_id long term).
  context_snapshot?: Record<string, unknown>;
  risk_budget_snapshot?: {
    max_runtime_seconds?: number;
    max_tool_calls?: number;
    max_external_domains?: number;
    max_data_egress_bytes?: number;
    max_token_spend_usd?: number;
    approval_on_privilege_escalation?: boolean;
  };
  budget_violation_reason?: string;

  policy_evaluation: DecisionTracePolicyEvaluation;
  outcome?: Record<string, unknown>;
  provenance?: unknown[];
  signatures?: DecisionTraceSignatures;
  privacy?: DecisionTracePrivacy;

  // NEW: Enhanced reasoning capture
  reasoning?: DecisionReasoning;

  // NEW: Organizational context
  organizational_context?: OrganizationalContext;
}

// Backwards-compatible alias (use DecisionTraceV1 explicitly when version matters).
export type DecisionTrace = DecisionTraceV1;
