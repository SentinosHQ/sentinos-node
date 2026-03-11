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
export type TraceRetentionPolicy = Record<string, unknown>;
export type TraceRetentionEnforcementRun = Record<string, unknown>;
export type TracePrivacyPolicy = Shared.TracePrivacyPolicy;
export type TracePrivacyScanResult = Shared.TracePrivacyScanResult;
export type TraceReplayResponse = Record<string, unknown>;
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
