export type Decision = "ALLOW" | "DENY" | "ESCALATE" | "SHADOW";
export type DecisionTraceCheckCategory =
  | "permission"
  | "approval"
  | "budget"
  | "privacy"
  | "handoff"
  | "identity"
  | "tool"
  | "context"
  | "other";
export type DecisionTraceCheckStatus = "CHECKED" | "ALLOWED" | "DENIED" | "ESCALATED" | "SHADOWED";
export type DecisionTraceCostPricingSource = "reported" | "estimated" | "mixed" | "unknown";
export type DecisionTraceCostEventKind = "llm" | "tool" | "retry" | "replay" | "export" | "blocked" | "approval_wait" | "other";
export type TraceArtifactKind = "file" | "connector" | "domain" | "output" | "handoff" | "other";
export type TraceArtifactStatus = "observed" | "produced" | "consumed" | "blocked";
export type TraceArtifactAction = "read" | "write" | "call" | "egress" | "produce" | "reuse" | "handoff" | "blocked";
export type OtelExportProtocol = "http/protobuf";
export type OtelExportPrivacyMode = "policy_enforced";
export type TraceReplayProfile =
  | "active_policy_chain"
  | "original_policy"
  | "original_snapshot"
  | "original_policy_and_snapshot"
  | "current_policy_with_original_snapshot";
export type TraceReplayPolicySource =
  | "active_policy_chain"
  | "original_trace_policy"
  | "explicit_policy_keys"
  | "unavailable";
export type TraceReplaySnapshotSource =
  | "original_snapshot"
  | "current_context"
  | "bounded_assumptions"
  | "unavailable";
export type TraceReplayFidelity = "deterministic" | "bounded" | "best_effort" | "unsupported";

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

export interface DecisionTracePolicyCheck {
  key: string;
  label: string;
  category: DecisionTraceCheckCategory;
  status: DecisionTraceCheckStatus;
  reason?: string;
  matched?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DecisionTraceCostProviderModelBreakdown {
  provider: string;
  model: string;
  usd?: number;
  tokens?: number;
}

export interface DecisionTraceCostRetryBreakdown {
  retry_index: number;
  usd?: number;
  tokens?: number;
}

export interface DecisionTraceCostToolBreakdown {
  tool: string;
  usd?: number;
  tokens?: number;
}

export interface DecisionTraceCostActorBreakdown {
  actor: string;
  usd?: number;
  tokens?: number;
}

export interface DecisionTraceCostBreakdown {
  total_usd?: number;
  reported_total_usd?: number;
  estimated_total_usd?: number;
  pricing_source?: DecisionTraceCostPricingSource;
  provider?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
  retry_count?: number;
  tool_call_count?: number;
  blocked_cost_avoided_usd?: number;
  blocked_token_avoided?: number;
  by_category?: Record<string, number>;
  by_provider_model?: DecisionTraceCostProviderModelBreakdown[];
  by_retry?: DecisionTraceCostRetryBreakdown[];
  by_tool?: DecisionTraceCostToolBreakdown[];
  by_actor?: DecisionTraceCostActorBreakdown[];
}

export interface DecisionTraceCostEvent {
  event_id: string;
  kind: DecisionTraceCostEventKind;
  label: string;
  provider?: string;
  model?: string;
  tool?: string;
  actor?: string;
  retry_index?: number;
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
  reported_usd?: number;
  estimated_usd?: number;
  pricing_source?: DecisionTraceCostPricingSource;
  avoided_usd?: number;
  avoided_tokens?: number;
  started_at?: string;
  finished_at?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceArtifactLineageSummary {
  artifact_count: number;
  side_effect_count: number;
  blocked_count: number;
  kinds: Record<string, number>;
  top_domains?: string[];
  top_connectors?: string[];
  top_outputs?: string[];
  has_handoff?: boolean;
  has_writes?: boolean;
  has_blocked_side_effects?: boolean;
}

export interface TraceArtifactRef {
  artifact_id: string;
  kind: TraceArtifactKind;
  label: string;
  locator?: string;
  status?: TraceArtifactStatus;
  chronos_entity_id?: string;
  chronos_anchor?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceArtifactLineageEvent {
  event_id: string;
  artifact_id: string;
  action: TraceArtifactAction;
  actor?: string;
  tool?: string;
  timestamp?: string;
  related_artifact_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceArtifactLineageResponse {
  trace_id: string;
  summary: TraceArtifactLineageSummary;
  artifacts: TraceArtifactRef[];
  events: TraceArtifactLineageEvent[];
}

export interface TraceReplayReconstructionBasis {
  requested_profile: TraceReplayProfile;
  effective_profile: TraceReplayProfile;
  original_policy_key?: string;
  replay_policy_keys?: string[];
  context_snapshot_id?: string;
  distributed_trace_id?: string;
  distributed_span_id?: string;
  environment_assumptions?: Record<string, unknown>;
}

export interface TraceReplayDecision {
  decision?: Decision;
  policy_key?: string;
  policy_id?: string;
  policy_version?: string;
  reason?: string;
  evidence?: unknown[];
  explain_plan?: Record<string, unknown>;
  checks?: DecisionTracePolicyCheck[];
  cost_breakdown?: DecisionTraceCostBreakdown;
  cost_events?: DecisionTraceCostEvent[];
}

export interface OtelExportConfig {
  enabled: boolean;
  endpoint?: string;
  protocol?: OtelExportProtocol;
  traces_enabled: boolean;
  metrics_enabled: boolean;
  include_sentinos_extensions: boolean;
  include_internal_service_spans: boolean;
  resource_attributes?: Record<string, string>;
  header_values_write_only?: Record<string, string>;
  header_keys_masked?: string[];
  deep_link_template?: string;
  privacy_mode?: OtelExportPrivacyMode;
  updated_at?: string;
}

export interface OtelExportStatus {
  enabled: boolean;
  last_successful_export_at?: string;
  last_error_summary?: string;
  queue_depth?: number;
  dropped_batch_count?: number;
  traces_exported?: number;
  metrics_exported?: number;
  updated_at?: string;
}

export interface OtelExportTestResult {
  ok: boolean;
  trace_delivered?: boolean;
  metrics_delivered?: boolean;
  status_code?: number;
  message?: string;
  error?: string;
  tested_at?: string;
}

export interface DecisionTracePolicyEvaluation {
  policy_id: string;
  policy_version?: string;
  decision: Decision;
  reason?: string;
  evidence?: DecisionTraceEvidenceItem[];
  explain_plan?: Record<string, unknown>;
  checks?: DecisionTracePolicyCheck[];
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
  cost_breakdown?: DecisionTraceCostBreakdown;
  cost_events?: DecisionTraceCostEvent[];
  artifact_lineage_summary?: TraceArtifactLineageSummary;
  distributed_trace_id?: string;
  distributed_span_id?: string;

  // NEW: Enhanced reasoning capture
  reasoning?: DecisionReasoning;

  // NEW: Organizational context
  organizational_context?: OrganizationalContext;
}

// Backwards-compatible alias (use DecisionTraceV1 explicitly when version matters).
export type DecisionTrace = DecisionTraceV1;

export interface TraceReplayComparison {
  decision_changed?: boolean;
  policy_changed?: boolean;
  reason_changed?: boolean;
  checks_added?: number;
  checks_removed?: number;
  checks_changed?: number;
  cost_changed?: boolean;
  total_cost_delta_usd?: number;
  avoided_cost_delta_usd?: number;
}

export interface TraceReplayResponse {
  trace_id: string;
  tenant_id: string;
  replayed_at: string;
  profile?: TraceReplayProfile;
  policy_source?: TraceReplayPolicySource;
  snapshot_source?: TraceReplaySnapshotSource;
  fidelity?: TraceReplayFidelity;
  fidelity_reasons?: string[];
  reconstruction_basis?: TraceReplayReconstructionBasis;
  evidence_export_ready?: boolean;
  evidence_export_hints?: string[];
  policy_keys: string[];
  drift_detected: boolean;
  original: TraceReplayDecision;
  replay: TraceReplayDecision;
  comparison?: TraceReplayComparison;
  ledger_verification?: Record<string, unknown>;
}

export interface TraceReplayMatrixEntry {
  profile: TraceReplayProfile;
  policy_source?: TraceReplayPolicySource;
  snapshot_source?: TraceReplaySnapshotSource;
  fidelity?: TraceReplayFidelity;
  fidelity_reasons?: string[];
  drift_detected: boolean;
  replay: TraceReplayDecision;
  comparison?: TraceReplayComparison;
}

export interface TraceReplayMatrixResponse {
  trace_id: string;
  tenant_id: string;
  computed_at: string;
  entries: TraceReplayMatrixEntry[];
}

export interface TraceReplayExportResponse {
  trace_id: string;
  tenant_id: string;
  profile?: TraceReplayProfile;
  export_job: {
    job_id: string;
    status: string;
    object_url?: string;
    payload_sha256?: string;
    retention_until?: string;
    created_at?: string;
  };
  replay: TraceReplayResponse;
}
