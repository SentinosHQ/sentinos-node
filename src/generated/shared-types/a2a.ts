export interface A2AHandoffAuthorizeRequest {
  handoff_id?: string;
  tenant_id?: string;
  session_id?: string;
  sender_agent: string;
  receiver_agent: string;
  classification?: string;
  policy_keys?: string[];
  metadata?: Record<string, unknown>;
  decision?: "ALLOW" | "DENY" | "ESCALATE" | "SHADOW";
}

export interface A2AHandoffReceipt {
  receipt_id: string;
  handoff_id: string;
  tenant_id?: string;
  session_id?: string;
  sender_agent: string;
  receiver_agent: string;
  classification?: string;
  policy_keys?: string[];
  decision: "ALLOW" | "DENY" | "ESCALATE" | "SHADOW" | string;
  reason?: string;
  issued_at: string;
  signature: string;
}

export interface A2AHandoffLineageEntry {
  handoff_id: string;
  tenant_id?: string;
  session_id?: string;
  sender_agent: string;
  receiver_agent: string;
  classification?: string;
  decision: string;
  reason?: string;
  policy_keys?: string[];
  issued_at: string;
  receipt_id: string;
  receipt_signature: string;
}

export interface A2AHandoffLineageResponse {
  handoff_id: string;
  lineage: A2AHandoffLineageEntry[];
}

export interface A2AHandoffReceiptVerification {
  handoff_id: string;
  receipt_id: string;
  decision: string;
  issued_at: string;
  verified: boolean;
  reason: string;
  observed_signature: string;
  expected_signature: string;
  verification_source: string;
}

export interface A2ATrustScore {
  agent_id: string;
  agent_trust_score: number;
  score_factors: {
    total_handoffs: number;
    allow_count: number;
    deny_count: number;
    escalate_count: number;
    shadow_count: number;
    violation_rate: number;
  };
  last_violations: Array<{
    handoff_id: string;
    decision: string;
    issued_at: string;
    reason?: string;
  }>;
  attestation_status: string;
  updated_at: string;
}
