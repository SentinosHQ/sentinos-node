import { describe, expect, it } from "vitest";

import type { DecisionTrace } from "../src/generated/shared-types";

describe("agent rationale generated types", () => {
  it("accept trace-level agent_rationale", () => {
    const trace: DecisionTrace = {
      schema_version: "decision-trace.v1",
      trace_id: "00000000-0000-0000-0000-000000000015",
      timestamp: "2026-05-17T12:00:00Z",
      tenant_id: "org_123",
      intent: { type: "tool_call", tool: "github.create_issue", args: { repo: "sentinos" } },
      agent_rationale: {
        schema_version: "agent-rationale.v1",
        captured_at: "2026-05-17T12:00:00Z",
        capture_phase: "pre_execution",
        capture_mode: "model_supplied",
        sources: [{ kind: "model", field_paths: ["metadata.agent_rationale"] }],
        summary: "Create an auditable remediation item.",
        runtime: { provider: "openai", model: "gpt-5", tool: "github.create_issue" },
        safety: {
          hidden_reasoning_dropped: true,
          forbidden_fields: ["$.metadata.agent_rationale.hidden_reasoning"],
        },
      },
      policy_evaluation: { policy_id: "seed.github.issue", decision: "ALLOW" },
    };

    expect(trace.agent_rationale?.capture_phase).toBe("pre_execution");
    expect(trace.agent_rationale?.sources[0]?.kind).toBe("model");
    expect(trace.agent_rationale?.safety?.hidden_reasoning_dropped).toBe(true);
  });
});
