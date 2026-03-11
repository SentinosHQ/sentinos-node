/**
 * NOTE:
 * These types are derived from the canonical contracts in `packages/api-schemas/*`.
 * Once OpenAPI/JSON-schema codegen is wired, this file should be generated.
 */

export * from "./decision-trace";
export * from "./governance";
export * from "./identity";
export * from "./autonomy";
export * from "./a2a";
export * from "./privacy";
export * from "./audit";
export * from "./dashboards";
export * from "./openapi";

export interface PolicyScope {
  target_tools: string[];
  tenants: string[];
}

export type PolicyLanguage = "rego";
export type PolicySource = "nl" | "rego";

export interface VerificationReport {
  status: "PASS" | "FAIL" | "UNKNOWN";
  proof_id?: string;
  [k: string]: unknown;
}

export interface PolicyMetadata {
  policy_id: string;
  version: string;
  owner?: string;
  scope: PolicyScope;
  language: PolicyLanguage;
  source: PolicySource;
  created_at: string;
  verification_report?: VerificationReport;
  tags?: string[];
  severity?: "low" | "medium" | "high" | "critical";
  governance_category?: string;
  alert_on_violation?: boolean;
  alert_severity?: "low" | "medium" | "high" | "critical";
}
