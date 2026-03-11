export type AutonomySessionStatus = "ACTIVE" | "PAUSED" | "TERMINATED";

export interface AutonomyRiskBudget {
  max_runtime_seconds?: number;
  max_tool_calls?: number;
  max_external_domains?: number;
  max_data_egress_bytes?: number;
  max_token_spend_usd?: number;
  approval_on_privilege_escalation?: boolean;
}

export interface AutonomySession {
  session_id: string;
  tenant_id: string;
  agent_id: string;
  status: AutonomySessionStatus;
  started_at: string;
  updated_at: string;
  paused_at?: string;
  terminated_at?: string;
  risk_budget_snapshot?: AutonomyRiskBudget;
  budget_violation_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AutonomySessionCreateRequest {
  tenant_id?: string;
  agent_id: string;
  session_id?: string;
  risk_budget_snapshot?: AutonomyRiskBudget;
  metadata?: Record<string, unknown>;
}

export interface AutonomySessionPatchRequest {
  risk_budget_snapshot?: AutonomyRiskBudget;
  budget_violation_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AutonomySessionActionRequest {
  reason?: string;
}
