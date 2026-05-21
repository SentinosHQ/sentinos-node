import { pathToFileURL } from "node:url";

import { LLMGuard, SentinosClient, makeGuardedTool } from "@sentinos/node";

type AgentsToolFactory = (args: {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}) => unknown;

type AgentCtor = new (args: {
  name: string;
  instructions: string;
  model?: string;
  modelSettings?: Record<string, unknown>;
  toolUseBehavior?: string;
  tools: unknown[];
}) => unknown;

type RunFn = (agent: unknown, input: string) => Promise<Record<string, unknown>>;

type ModelSettings = {
  toolChoice?: string;
};

type RefundExecutor = (args: {
  payment_intent: string;
  amount: number;
  currency: string;
}) => Promise<Record<string, unknown>> | Record<string, unknown>;

type AgentsExamplePayload = {
  traceId: string;
  decision: string;
  refundId?: string;
  rationaleMode?: string;
  rationaleSummary?: string;
  nextStep: string;
};

export async function runOpenAIAgentsGovernedToolsExample(opts: {
  client?: { kernel: SentinosClient["kernel"] };
  refundExecutor?: RefundExecutor;
  Agent?: AgentCtor;
  runAgent?: RunFn;
  toolFactory?: AgentsToolFactory;
  output?: (payload: AgentsExamplePayload) => void;
} = {}): Promise<AgentsExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const guard = new LLMGuard({
    kernel: client.kernel,
    agentId: process.env.SENTINOS_AGENT_ID || "support-agent",
    sessionId: process.env.SENTINOS_SESSION_ID || `sess-${Date.now()}`,
  });

  const agentsModule =
    opts.Agent && opts.runAgent && opts.toolFactory
      ? null
      : await import("@openai/agents");

  const Agent = opts.Agent || (agentsModule?.Agent as AgentCtor);
  const runAgent = opts.runAgent || (agentsModule?.run as RunFn);
  const toolFactory = opts.toolFactory || ((agentsModule as any)?.tool as AgentsToolFactory);
  const refundExecutor: RefundExecutor =
    opts.refundExecutor ||
    (async (args) => ({
      id: `refund_${args.payment_intent}`,
      status: "submitted",
      amount: args.amount,
      currency: args.currency,
    }));

  const guardedRefund = makeGuardedTool({
    guard,
    toolName: "refund.execute",
    execute: async (args: {
      payment_intent: string;
      amount: number;
      currency: string;
    }) => refundExecutor(args),
  });

  let latestOutcome:
    | {
        traceId: string;
        decision: string;
        refundId?: string;
      }
    | undefined;

  const refundTool = toolFactory({
    name: "issue_refund",
    description:
      "Issue a refund through a Sentinos-governed side-effect boundary.",
    parameters: {
      type: "object",
      properties: {
        payment_intent: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
      },
      additionalProperties: false,
      required: ["payment_intent", "amount", "currency"],
    },
    execute: async (input) => {
      const result = await guardedRefund({
        payment_intent: String(input.payment_intent || "pi_demo_refund"),
        amount: Number(input.amount || 1800),
        currency: typeof input.currency === "string" ? input.currency : "USD",
      });
      latestOutcome = {
        traceId: result.trace_id,
        decision: result.decision,
        refundId: String(
          (result.result as Record<string, unknown> | undefined)?.id || "",
        ),
      };
      return result;
    },
  });

  const agent = new Agent({
    name: "Refund approvals agent",
    instructions:
      "Review refund requests and use the issue_refund tool when a refund should proceed.",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    modelSettings: { toolChoice: "required" } as ModelSettings,
    toolUseBehavior: "stop_on_first_tool",
    tools: [refundTool],
  });

  await runAgent(
    agent,
    "Issue a refund for payment intent pi_demo_refund for 1800 cents in USD because the customer requested a refund.",
  );

  if (!latestOutcome) {
    throw new Error("OpenAI Agents example did not produce a governed tool call.");
  }

  const payload = {
    traceId: latestOutcome.traceId,
    decision: latestOutcome.decision,
    refundId: latestOutcome.refundId,
    rationaleMode: "sdk_derived",
    rationaleSummary: "Authorize tool-runtime.refund.execute before execution.",
    nextStep:
      "Open the Sentinos console, search for the traceId in Traces, and inspect Agent Rationale for the governed tool call.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOpenAIAgentsGovernedToolsExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
