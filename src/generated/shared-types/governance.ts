export type AlertRuleType = "THRESHOLD" | "ANOMALY" | "PATTERN" | "COMPLIANCE";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "FIRING" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED" | "ESCALATED";

export interface AlertRule {
  rule_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  rule_type: AlertRuleType;
  severity: AlertSeverity;
  enabled: boolean;
  metric_key?: string;
  comparator?: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold_value?: number;
  pattern?: string;
  compliance_control?: string;
  evaluation_window_sec: number;
  cooldown_sec: number;
  notification_channels?: string[];
  metadata?: Record<string, unknown>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  alert_id: string;
  tenant_id: string;
  rule_id?: string;
  anomaly_id?: string;
  incident_id?: string;
  status: AlertStatus;
  severity: AlertSeverity;
  title: string;
  description?: string;
  correlation_key?: string;
  dedupe_bucket?: string;
  metric_value?: number;
  threshold_value?: number;
  labels?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  first_fired_at?: string;
  last_fired_at?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  escalated_at?: string;
  escalated_to?: string;
  created_at: string;
  updated_at: string;
}

export type AnomalyType = "ZSCORE" | "PATTERN";
export type AnomalyStatus = "OPEN" | "INVESTIGATING" | "CLOSED" | "FALSE_POSITIVE";

export interface Anomaly {
  anomaly_id: string;
  tenant_id: string;
  rule_id?: string;
  type: AnomalyType;
  metric_key?: string;
  observed_value?: number;
  expected_value?: number;
  z_score?: number;
  confidence?: number;
  status: AnomalyStatus;
  false_positive: boolean;
  investigation_notes?: string;
  investigated_by?: string;
  investigated_at?: string;
  linked_alert_id?: string;
  context?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "MITIGATING" | "RESOLVED";
export type IncidentSource = "AUTO" | "MANUAL";

export interface Incident {
  incident_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  source: IncidentSource;
  correlation_key?: string;
  started_at?: string;
  detected_at?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  mttd_seconds?: number;
  mttr_seconds?: number;
  created_by?: string;
  updated_by?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannel {
  channel_id: string;
  tenant_id: string;
  kind: string;
  name: string;
  config?: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  audit_id: string;
  tenant_id: string;
  actor?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface ComplianceReport {
  tenant_id: string;
  generated_at: string;
  window_start: string;
  window_end: string;
  metrics: Record<string, unknown>;
  recent_audit_items: AuditLogEntry[];
}
