import type * as Shared from "./generated/shared-types/index.js";
import type { components, operations, paths } from "./generated/shared-types/index.js";

export type OpenAPIPaths = paths;
export type OpenAPIComponents = components;
export type OpenAPIOperations = operations;

export type AuthTokens = Shared.AuthTokens;
export type AuthMe = Shared.AuthMe;
export type Organization = Shared.Organization;
export type Membership = Shared.Membership;
export type MemberRecord = Shared.MemberRecord;
export type Invitation = Shared.Invitation;
export type Role = Shared.Role;
export type Team = Shared.Team;
export type TeamMembership = Shared.TeamMembership;
export type TeamSettings = Shared.TeamSettings;
export type ServiceAccount = Shared.ServiceAccount;
export type ServiceAccountTokenIssue = Shared.ServiceAccountTokenIssue;
export type OrgLoginMethods = Shared.OrgLoginMethods;
export type WorkforceAccessPolicy = Shared.WorkforceAccessPolicy;
export type WorkforceGroupMapping = Shared.WorkforceGroupMapping;
export type WorkforceSubject = Shared.WorkforceSubject;
export type WorkforceTokenSession = Shared.WorkforceTokenSession;
export type SAMLConfig = Shared.SAMLConfig;
export type AuthNMapping = Shared.AuthNMapping;
export type SCIMToken = Shared.SCIMToken;
export type AuthSessionRecord = components["schemas"]["AuthSessionRecord"];
export type UserLoginMethodOverrideResponse = components["schemas"]["UserLoginMethodOverrideResponse"];
export type WorkforceRolloutWave = components["schemas"]["WorkforceRolloutWave"];
export type WorkforceRolloutStatus = components["schemas"]["WorkforceRolloutStatus"];

export type DecisionTrace = Shared.DecisionTrace;
export type PolicyCheck = Shared.DecisionTracePolicyCheck;
export type PolicyCheckCategory = Shared.DecisionTraceCheckCategory;
export type PolicyCheckStatus = Shared.DecisionTraceCheckStatus;
export type TraceRetentionPolicy = Record<string, unknown>;
export type TraceRetentionEnforcementRun = Record<string, unknown>;
export type TracePrivacyPolicy = Shared.TracePrivacyPolicy;
export type TracePrivacyScanResult = Shared.TracePrivacyScanResult;
export type TraceReplayComparison = Shared.TraceReplayComparison;
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
export type TraceReplayFidelity =
  | "deterministic"
  | "bounded"
  | "best_effort"
  | "unsupported";
export type TraceReplayReconstructionBasis = {
  policy_keys?: string[];
  original_policy_key?: string;
  original_policy_id?: string;
  original_policy_version?: string;
  snapshot_id?: string;
  environment_assumptions?: Record<string, unknown>;
};
export type TraceReplayDecision = (components["schemas"]["TraceReplayDecision"] & {
  checks?: PolicyCheck[];
  cost_breakdown?: TraceCostBreakdown;
  cost_events?: TraceCostEvent[];
}) | null;
export type TraceReplayResponse = {
  trace_id: string;
  tenant_id: string;
  replayed_at: string;
  policy_keys?: string[];
  drift_detected?: boolean;
  profile?: TraceReplayProfile;
  policy_source?: TraceReplayPolicySource;
  snapshot_source?: TraceReplaySnapshotSource;
  fidelity?: TraceReplayFidelity;
  fidelity_reasons?: string[];
  reconstruction_basis?: TraceReplayReconstructionBasis;
  evidence_export_ready?: boolean;
  evidence_export_hints?: string[];
  original?: TraceReplayDecision;
  replay?: TraceReplayDecision;
  comparison?: TraceReplayComparison;
  ledger_verification?: Record<string, unknown>;
};
export type TraceReplayMatrixEntry = {
  profile: TraceReplayProfile;
  response?: TraceReplayResponse;
};
export type TraceReplayMatrixResponse = {
  trace_id: string;
  tenant_id: string;
  generated_at: string;
  entries: TraceReplayMatrixEntry[];
};
export type TraceReplayExportResponse = {
  trace_id: string;
  tenant_id: string;
  profile: TraceReplayProfile;
  export_job: TraceExportJob;
  replay: TraceReplayResponse;
};
export type TraceCostBreakdown = Shared.DecisionTraceCostBreakdown;
export type TraceCostEvent = Shared.DecisionTraceCostEvent;
export type TraceArtifactKind = Shared.TraceArtifactKind;
export type TraceArtifactStatus = Shared.TraceArtifactStatus;
export type TraceArtifactAction = Shared.TraceArtifactAction;
export type TraceArtifactLineageSummary = Shared.TraceArtifactLineageSummary;
export type TraceArtifactRef = Shared.TraceArtifactRef;
export type TraceArtifactLineageEvent = Shared.TraceArtifactLineageEvent;
export type TraceArtifactLineageResponse = Shared.TraceArtifactLineageResponse;
export type OtelExportProtocol = "http/protobuf";
export type OtelExportPrivacyMode = "policy_enforced";
export type OtelExportConfig = {
  enabled?: boolean;
  endpoint?: string;
  protocol?: OtelExportProtocol;
  traces_enabled?: boolean;
  metrics_enabled?: boolean;
  include_sentinos_extensions?: boolean;
  include_internal_service_spans?: boolean;
  resource_attributes?: Record<string, string>;
  header_values_write_only?: Record<string, string>;
  header_keys_masked?: string[];
  deep_link_template?: string;
  privacy_mode?: OtelExportPrivacyMode;
  updated_at?: string;
};
export type OtelExportStatus = {
  enabled?: boolean;
  last_successful_export_at?: string;
  last_error_summary?: string;
  queue_depth?: number;
  dropped_batch_count?: number;
  traces_exported?: number;
  metrics_exported?: number;
  updated_at?: string;
};
export type OtelExportTestResult = {
  ok: boolean;
  trace_delivered?: boolean;
  metrics_delivered?: boolean;
  status_code?: number;
  message?: string;
  error?: string;
  endpoint?: string;
  tested_at?: string;
};
export type KernelCostSummaryRow = components["schemas"]["KernelCostSummaryRow"];
export type KernelCostSummaryResponse = components["schemas"]["KernelCostSummaryResponse"];
export type KernelCostEventsResponse = components["schemas"]["KernelCostEventsResponse"];
export type KernelCostAvoidedRow = components["schemas"]["KernelCostAvoidedRow"];
export type KernelCostAvoidedResponse = components["schemas"]["KernelCostAvoidedResponse"];
export type KernelCostAnomaly = components["schemas"]["KernelCostAnomaly"];
export type KernelCostAnomaliesResponse = components["schemas"]["KernelCostAnomaliesResponse"];
export type TraceLedgerVerification = Record<string, unknown>;
export type TraceExportJob = Record<string, unknown>;
export type TraceSearchResult = Record<string, unknown>;

export type AlertRule = Shared.AlertRule;
export type AlertRecord = Shared.Alert;
export type AnomalyRecord = Shared.Anomaly;
export type IncidentRecord = Shared.Incident;

export type AutonomySession = Shared.AutonomySession;

export type AuditActor = Shared.AuditActor;
export type AuditTarget = Shared.AuditTarget;
export type AuditContext = Shared.AuditContext;
export type AuditChange = Shared.AuditChange;
export type AuditEvent = Shared.AuditEvent;
export type AuditQuery = Shared.AuditQuery;
export type AuditQueryResult = Shared.AuditQueryResult;
export type AuditSavedView = Shared.AuditSavedView;
export type AuditNotableRule = Shared.AuditNotableRule;
export type AuditNotableEvent = components["schemas"]["UnifiedAuditNotableEvent"];

export type DashboardDefinition = Shared.DashboardDefinition;
export type DashboardWidget = Shared.DashboardWidget;
export type DashboardSavedView = Shared.DashboardSavedView;
export type DashboardPermission = Shared.DashboardPermission;
export type WidgetQueryAST = Shared.WidgetQueryAST;
export type WidgetFormula = Shared.WidgetFormula;
export type TemplateVariable = Shared.TemplateVariable;
export type TemplateVariablePreset = Shared.TemplateVariablePreset;
export type DashboardVersion = components["schemas"]["CustomDashboardVersion"];

export type ChronosSnapshot = Record<string, unknown>;
export type ChronosQueryResponse = Record<string, unknown>;
export type ChronosComplianceReport = Record<string, unknown>;

export type A2AHandoffReceipt = Shared.A2AHandoffReceipt;
export type A2AHandoffLineageResponse = Shared.A2AHandoffLineageResponse;
export type A2ATrustScore = Shared.A2ATrustScore;

export type MarketplacePack = Record<string, unknown>;
export type MarketplaceInstall = Record<string, unknown>;

export type NotificationChannel = Shared.NotificationChannel;
export type NotificationTestResult = Record<string, unknown>;
export type NotificationValidationResult = Record<string, unknown>;

export type BillingEntitlements = Record<string, unknown>;
export type BillingUsageSummary = Record<string, unknown>;
export type BillingUsageEvent = Record<string, unknown>;

export type PolicyRecord = Shared.PolicyMetadata;
export type PolicyBundle = Record<string, unknown>;

export type IdentityAuditResponse = {
  items: Array<Record<string, unknown>>;
};

export type KernelExecuteResponse =
  operations["kernelExecute"]["responses"]["200"]["content"]["application/json"];
