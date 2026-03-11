export type TraceDataClass = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "REGULATED" | "SECRET";

export interface TracePrivacyPolicy {
  tenant_id: string;
  enabled: boolean;
  default_class: TraceDataClass;
  export_redaction_enabled: boolean;
  retention_by_class: Record<string, number>;
  updated_at: string;
}

export interface TracePrivacyPolicyUpdateRequest {
  enabled?: boolean;
  default_class?: TraceDataClass;
  export_redaction_enabled?: boolean;
  retention_by_class?: Record<string, number>;
}

export interface TracePrivacyRedactionEvent {
  redaction_rule_id: string;
  field_path: string;
  match_type: string;
  before_hash: string;
  after_hash: string;
  reason: string;
}

export interface TracePrivacyScanRequest {
  data_class?: TraceDataClass;
  payload: unknown;
}

export interface TracePrivacyScanResult {
  tenant_id: string;
  data_class: TraceDataClass;
  policy_version: string;
  redacted: boolean;
  redacted_payload: unknown;
  events: TracePrivacyRedactionEvent[];
  scanned_at: string;
}
