import { describe, expect, it, vi } from "vitest";

import { runOpenAIGovernedToolCallingExample } from "../examples/openai-governed-tool-calling";
import { runAnthropicGovernedMessagesExample } from "../examples/anthropic-governed-messages";
import { runLocalEvaluationQuickstartExample } from "../examples/local-evaluation-quickstart.mjs";
import { runOtelExportBridgeExample } from "../examples/otel-export-bridge";
import { runHoneycombOtelExportExample } from "../examples/otel-export-honeycomb";
import { runDatadogMetricsOtelExportExample } from "../examples/otel-export-datadog-metrics";
import { runTraceReplayEvidenceExample } from "../examples/trace-replay-evidence";
import { runStripeGovernedRefundExample } from "../examples/stripe-governed-refund";
import { runX402GovernedAgentPaymentExample } from "../examples/x402-governed-agent-payment";
import { runPaymentGovernancePolicyMatrixExample } from "../examples/payment-governance-policy-matrix";
import { runOpenAIAgentsGovernedToolsExample } from "../examples/openai-agents-governed-tools";
import { runDatadogExportExample } from "../examples/datadog-export";
import { runSlackOperatorWorkflowExample } from "../examples/slack-operator-routing";

function allowTrace(
  traceId = "trace_node_example_1",
  intentTool = "llm.openai.responses.create",
  decision = "ALLOW",
  agentRationale?: Record<string, unknown>,
) {
  const defaultRationale = {
    schema_version: "agent-rationale.v1",
    captured_at: "2026-04-02T00:00:00Z",
    capture_phase: "pre_execution",
    capture_mode: "sdk_derived",
    sources: [{ kind: "sdk", field_paths: ["provider", "operation", "model", "toolName"] }],
    summary: `Authorize ${intentTool} before execution.`,
    decision_basis: [`Tool: ${intentTool}`],
    runtime: {
      integration: "llm_guard",
      provider: intentTool.startsWith("payment.") ? "runtime" : "openai",
      operation: intentTool,
    },
    safety: {},
  };

  return {
    schema_version: "decision-trace.v1",
    trace_id: traceId,
    timestamp: "2026-04-02T00:00:00Z",
    tenant_id: "acme",
    agent_id: "support-agent",
    session_id: "sess-example",
    intent: {
      type: "llm_call",
      tool: intentTool,
      args: {},
    },
    policy_evaluation: {
      policy_id: "llm-guard",
      policy_version: "v1",
      decision,
      reason: "rule-evaluated",
    },
    agent_rationale: { ...defaultRationale, ...(agentRationale || {}) },
  };
}

function fakePaymentMatrixClient() {
  const decisions: Record<string, string> = {
    allow: "ALLOW",
    shadow: "SHADOW",
    escalate: "ESCALATE",
    deny: "DENY",
  };
  const traceDecisions = new Map<string, string>();
  return {
    kernel: {
      execute: vi.fn().mockImplementation(async (input: any) => {
        const scenario = String(input.metadata?.scenario || "allow");
        const traceId = `trace_node_payment_matrix_${scenario}`;
        traceDecisions.set(traceId, decisions[scenario] || "DENY");
        return { trace_id: traceId, decision: decisions[scenario] || "DENY" };
      }),
      getTrace: vi.fn().mockImplementation(async (traceId: string) =>
        allowTrace(traceId, "payment.x402", traceDecisions.get(traceId) || "DENY"),
      ),
      appendSessionEvent: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
}

function fakeRuntimeClient(
  traceId = "trace_node_example_1",
  intentTool = "llm.openai.responses.create",
) {
  let lastExecute: any;
  return {
    kernel: {
      execute: vi.fn().mockImplementation(async (input: any) => {
        lastExecute = input;
        return { trace_id: traceId, decision: "ALLOW" };
      }),
      getTrace: vi.fn().mockImplementation(async () =>
        allowTrace(
          traceId,
          intentTool,
          "ALLOW",
          lastExecute?.metadata?.agent_rationale,
        ),
      ),
      appendSessionEvent: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
}

describe("Node example smoke tests", () => {
  it("runs the OpenAI governed example", async () => {
    const client = fakeRuntimeClient("trace_node_openai");
    const output = vi.fn();

    const payload = await runOpenAIGovernedToolCallingExample({
      client,
      openai: {
        responses: {
          create: async () => ({ id: "resp_openai" }),
        },
      },
      output,
    });

    expect(payload.traceId).toBe("trace_node_openai");
    expect(payload.decision).toBe("ALLOW");
    expect(payload.reason).toBe("rule-evaluated");
    expect(payload.rationaleMode).toBe("sdk_derived");
    expect(payload.rationaleSummary).toContain("Authorize");
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          tool: "llm.openai.responses.create",
        }),
        metadata: expect.objectContaining({
          agent_rationale: expect.objectContaining({
            schema_version: "agent-rationale.v1",
            capture_phase: "pre_execution",
            capture_mode: "sdk_derived",
            summary: "Authorize openai.responses.create before execution.",
            runtime: expect.objectContaining({
              provider: "openai",
              operation: "responses.create",
              model: "gpt-4.1-mini",
            }),
          }),
        }),
      }),
    );
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace_node_openai",
        decision: "ALLOW",
      }),
    );
  });

  it("runs the local evaluation quickstart example", async () => {
    const client = {
      controlplane: {
        authMe: vi.fn().mockResolvedValue({
          user: { email: "admin+quickstart@sentinos.demo" },
        }),
      },
      kernel: {
        execute: vi.fn().mockResolvedValue({
          trace_id: "trace_node_local_quickstart",
        }),
        getTrace: vi.fn().mockResolvedValue(
          allowTrace("trace_node_local_quickstart", "stripe.refund"),
        ),
      },
    };
    const output = vi.fn();

    const payload = await runLocalEvaluationQuickstartExample({
      client: client as any,
      appUrl: "http://127.0.0.1:4173",
      output,
    });

    expect(payload.orgId).toBe("acme");
    expect(payload.actorEmail).toBe("admin+quickstart@sentinos.demo");
    expect(payload.traceId).toBe("trace_node_local_quickstart");
    expect(payload.decision).toBe("ALLOW");
    expect(payload.consoleUrl).toBe("http://127.0.0.1:4173/#traces");
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          tool: "stripe.refund",
        }),
      }),
    );
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace_node_local_quickstart",
      }),
    );
  });

  it("runs the Anthropic governed example", async () => {
    const client = fakeRuntimeClient(
      "trace_node_anthropic",
      "llm.anthropic.messages.create",
    );

    const payload = await runAnthropicGovernedMessagesExample({
      client,
      anthropic: {
        messages: {
          create: async () => ({ id: "msg_anthropic" }),
        },
      },
      output: vi.fn(),
    });

    expect(payload.traceId).toBe("trace_node_anthropic");
    expect(payload.decision).toBe("ALLOW");
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          tool: "llm.anthropic.messages.create",
        }),
      }),
    );
    expect(client.kernel.appendSessionEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        payload: expect.objectContaining({
          provider: "anthropic",
          operation: "messages.create",
        }),
      }),
    );
  });

  it("runs the OTLP bridge example", async () => {
    const payload = await runOtelExportBridgeExample({
      client: {
        kernel: {
          updateOtelExportConfig: async (config) => config,
          testOtelExport: async () => ({ ok: true }),
          getOtelExportStatus: async () => ({
            queue_depth: 0,
            traces_exported: 4,
            metrics_exported: 4,
          }),
        },
      },
      output: vi.fn(),
    });

    expect(payload.enabled).toBe(true);
    expect(payload.testOk).toBe(true);
    expect(payload.tracesExported).toBe(4);
  });

  it("runs the Honeycomb OTLP example", async () => {
    const payload = await runHoneycombOtelExportExample({
      apiKey: "test-honeycomb-key",
      client: {
        kernel: {
          updateOtelExportConfig: async (config) => config,
          testOtelExport: async () => ({ ok: true }),
          getOtelExportStatus: async () => ({
            queue_depth: 0,
            traces_exported: 9,
            metrics_exported: 9,
          }),
        },
      },
      output: vi.fn(),
    });

    expect(payload.endpoint).toBe("https://api.honeycomb.io:443");
    expect(payload.headerKeys).toEqual(["x-honeycomb-team"]);
    expect(payload.testOk).toBe(true);
    expect(payload.tracesExported).toBe(9);
  });

  it("runs the Datadog metrics OTLP example", async () => {
    const payload = await runDatadogMetricsOtelExportExample({
      apiKey: "dd_test",
      client: {
        kernel: {
          updateOtelExportConfig: async (config) => config,
          testOtelExport: async () => ({
            ok: true,
            trace_delivered: false,
            metrics_delivered: true,
          }),
          getOtelExportStatus: async () => ({
            queue_depth: 0,
            traces_exported: 0,
            metrics_exported: 7,
          }),
        },
      },
      output: vi.fn(),
    });

    expect(payload.endpoint).toBe("https://otlp.datadoghq.com/v1/metrics");
    expect(payload.headerKeys).toEqual(["dd-api-key"]);
    expect(payload.tracesEnabled).toBe(false);
    expect(payload.metricsEnabled).toBe(true);
    expect(payload.metricsDelivered).toBe(true);
    expect(payload.metricsExported).toBe(7);
  });

  it("runs the replay and evidence example", async () => {
    const payload = await runTraceReplayEvidenceExample({
      client: {
        traces: {
          replayTrace: async () => ({
            profile: "original_policy_and_snapshot",
            replay: { decision: "ALLOW" },
            fidelity: "deterministic",
            drift_detected: false,
          }),
          replayTraceMatrix: async () => ({
            entries: [{ profile: "active_policy_chain" }],
          }),
          exportReplayEvidence: async () => ({
            export_job: { job_id: "job_replay_1" },
          }),
        },
      },
      traceId: "11111111-1111-1111-1111-111111111111",
      output: vi.fn(),
    });

    expect(payload.traceId).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.replayProfile).toBe("original_policy_and_snapshot");
    expect(payload.replayExportJobId).toBe("job_replay_1");
  });

  it("runs the Stripe governed refund example", async () => {
    const client = fakeRuntimeClient("trace_node_stripe", "tool.stripe.refund");

    const payload = await runStripeGovernedRefundExample({
      client,
      stripe: {
        refunds: {
          create: async () => ({ id: "re_123", status: "succeeded" }),
        },
      },
      output: vi.fn(),
    });

    expect(payload.traceId).toBe("trace_node_stripe");
    expect(payload.decision).toBe("ALLOW");
    expect(payload.refundId).toBe("re_123");
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          tool: "tool.stripe.refund",
        }),
        metadata: expect.objectContaining({
          integration_kind: "financial_action",
          payment_context: expect.objectContaining({
            provider: "stripe",
            rail: "refund",
            payment_id: "pi_demo_refund",
            amount: "1800",
            currency: "USD",
            resource: "ticket-4012",
          }),
        }),
      }),
    );
    expect(client.kernel.appendSessionEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        payload: expect.objectContaining({
          provider: "tool-runtime",
          operation: "stripe.refund",
        }),
      }),
    );
  });

  it("runs the x402 governed agent payment example", async () => {
    const client = fakeRuntimeClient("trace_node_x402", "payment.x402");
    const output = vi.fn();

    const payload = await runX402GovernedAgentPaymentExample({
      client,
      output,
    });

    expect(payload.traceId).toBe("trace_node_x402");
    expect(payload.decision).toBe("ALLOW");
    expect(payload.protocol).toBe("x402");
    expect(payload.rationaleMode).toBe("workflow_supplied");
    expect(payload.rationaleSummary).toBe("Authorize x402 payment proof attachment before requesting the paid resource.");
    expect(payload.merchant).toBe("agentic-market-demo");
    expect(payload.amount).toBe("0.25");
    expect(payload.network).toBe("base-sepolia");
    expect(payload.asset).toBe("USDC");
    expect(payload.settlementReference).toBe("settlement_mock_x402_base_sepolia_usdc_001");
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          type: "payment_authorization",
          tool: "payment.x402",
          args: expect.objectContaining({
            resource: "https://api.agentic-market.example/search/company-risk",
            pay_to: "0x1111111111111111111111111111111111111111",
            budget_window: expect.objectContaining({
              max_usd: "1.00",
              expires_in_seconds: 300,
            }),
          }),
        }),
        metadata: expect.objectContaining({
          integration_kind: "agentic_payment",
          payment_context: expect.objectContaining({
            protocol: "x402",
            merchant: "agentic-market-demo",
            resource: "https://api.agentic-market.example/search/company-risk",
            amount: "0.25",
            pay_to: "0x1111111111111111111111111111111111111111",
            network: "base-sepolia",
            asset: "USDC",
            budget_window: expect.objectContaining({
              max_usd: "1.00",
              expires_in_seconds: 300,
            }),
          }),
          agent_rationale: expect.objectContaining({
            capture_mode: "workflow_supplied",
            summary: "Authorize x402 payment proof attachment before requesting the paid resource.",
            decision_basis: expect.arrayContaining([
              "Payment protocol: x402",
              "Merchant: agentic-market-demo",
            ]),
            risk_context: expect.objectContaining({
              side_effects: ["payment_authorization", "external_api_access"],
            }),
          }),
        }),
      }),
    );
    expect(client.kernel.appendSessionEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        type: "payment.x402",
        payload: expect.objectContaining({
          provider: "x402",
          operation: "pay",
          summary: expect.objectContaining({
            merchant: "agentic-market-demo",
            resource: "https://api.agentic-market.example/search/company-risk",
            amount: "0.25",
            asset: "USDC",
            network: "base-sepolia",
            settlement_reference: "settlement_mock_x402_base_sepolia_usdc_001",
            response_status: 200,
          }),
        }),
      }),
    );
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace_node_x402",
        protocol: "x402",
      }),
    );
  });

  it("runs the Datadog export example", async () => {
    const output = vi.fn();
    const payload = await runDatadogExportExample({
      apiKey: "dd-demo",
      client: {
        kernel: {
          exportDatadog: async () => ({
            site: "datadoghq.com",
            metric_prefix: "sentinos",
            alerts_exported: 3,
            incidents_exported: 2,
            events_status: "sent",
          }),
        },
      },
      output,
    });

    expect(payload.site).toBe("datadoghq.com");
    expect(payload.metricPrefix).toBe("sentinos");
    expect(payload.alertsExported).toBe(3);
    expect(payload.incidentsExported).toBe(2);
    expect(payload.eventsStatus).toBe("sent");
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        site: "datadoghq.com",
        eventsStatus: "sent",
      }),
    );
  });

  it("runs the Slack operator workflow example", async () => {
    const output = vi.fn();
    const payload = await runSlackOperatorWorkflowExample({
      webhookUrl: "https://hooks.slack.com/services/demo/test",
      createChannel: true,
      client: {
        kernel: {
          validateNotificationChannel: async () => ({ ok: true }),
          createNotificationChannel: async () => ({ channel_id: "chan_slack_example" }),
          testNotificationChannel: async () => ({ success: true }),
          listEscalations: async () => ({
            escalations: [{ escalation_id: "esc_1", trace_id: "trace_slack_1" }],
          }),
        },
      },
      output,
    });

    expect(payload.validationOk).toBe(true);
    expect(payload.channelId).toBe("chan_slack_example");
    expect(payload.testSuccess).toBe(true);
    expect(payload.pendingEscalations).toBe(1);
    expect(payload.pendingTraceId).toBe("trace_slack_1");
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: "chan_slack_example",
        pendingEscalations: 1,
      }),
    );
  });

  it("runs the OpenAI Agents governed tools example", async () => {
    const client = fakeRuntimeClient("trace_node_agents", "tool.refund.execute");

    const toolFactory = vi.fn(({
      execute,
    }: {
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    }) => ({ execute }));

    class FakeAgent {
      tools: Array<{ execute: (input: Record<string, unknown>) => Promise<unknown> }>;

      constructor(args: {
        tools: Array<{ execute: (input: Record<string, unknown>) => Promise<unknown> }>;
      }) {
        this.tools = args.tools;
      }
    }

    const payload = await runOpenAIAgentsGovernedToolsExample({
      client,
      refundExecutor: async () => ({ id: "re_agent_1" }),
      Agent: FakeAgent as any,
      toolFactory,
      runAgent: async (agent) => {
        const tool = (agent as FakeAgent).tools[0];
        await tool.execute({
          payment_intent: "pi_demo_refund",
          amount: 1800,
          currency: "USD",
        });
        return { finalOutput: "Refund processed" };
      },
      output: vi.fn(),
    });

    expect(payload.traceId).toBe("trace_node_agents");
    expect(payload.decision).toBe("ALLOW");
    expect(payload.refundId).toBe("re_agent_1");
    expect(payload.rationaleMode).toBe("sdk_derived");
    expect(payload.rationaleSummary).toBe("Authorize tool-runtime.refund.execute before execution.");
    expect(toolFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "issue_refund",
        parameters: expect.objectContaining({
          additionalProperties: false,
        }),
      }),
    );
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          tool: "tool.refund.execute",
        }),
        metadata: expect.objectContaining({
          agent_rationale: expect.objectContaining({
            schema_version: "agent-rationale.v1",
            capture_phase: "pre_execution",
            capture_mode: "sdk_derived",
            summary: "Authorize tool-runtime.refund.execute before execution.",
            runtime: expect.objectContaining({
              provider: "tool-runtime",
              operation: "refund.execute",
              tool: "tool.refund.execute",
            }),
          }),
        }),
      }),
    );
  });

  it("runs the payment governance policy matrix example", async () => {
    const client = fakePaymentMatrixClient();
    const output = vi.fn();

    const payload = await runPaymentGovernancePolicyMatrixExample({
      client: client as any,
      output,
    });

    expect(payload.scenarios.map((scenario) => scenario.decision)).toEqual([
      "ALLOW",
      "SHADOW",
      "ESCALATE",
      "DENY",
    ]);
    expect(payload.scenarios.find((scenario) => scenario.label === "allow")?.settlementReference).toMatch(
      /^settlement_mock_allow_/,
    );
    expect(payload.scenarios.find((scenario) => scenario.label === "shadow")?.settlementReference).toMatch(
      /^settlement_mock_shadow_/,
    );
    expect(payload.scenarios.find((scenario) => scenario.label === "escalate")?.settlementReference).toBe("");
    expect(payload.scenarios.find((scenario) => scenario.label === "deny")?.settlementReference).toBe("");
    expect(client.kernel.execute).toHaveBeenCalledTimes(4);
    expect(client.kernel.appendSessionEvent).toHaveBeenCalledTimes(2);
    expect(client.kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          integration_kind: "agentic_payment",
          payment_context: expect.objectContaining({
            protocol: "x402",
            network: "base-sepolia",
          }),
        }),
      }),
    );
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        proofBoundary: expect.stringContaining("Provider-free governance proof"),
      }),
    );
  });
});
