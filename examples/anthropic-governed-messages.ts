import { pathToFileURL } from "node:url";

import { createAnthropicMessagesAdapter, LLMGuard, SentinosClient } from "@sentinos/node";

type AnthropicClient = {
  messages: {
    create(args: {
      model: string;
      messages: Array<Record<string, unknown>>;
      [key: string]: unknown;
    }): Promise<unknown> | unknown;
  };
};

type AnthropicExamplePayload = {
  traceId: string;
  decision?: string;
  reason?: string;
  nextStep: string;
};

export async function runAnthropicGovernedMessagesExample(opts: {
  client?: { kernel: SentinosClient["kernel"] };
  anthropic?: AnthropicClient;
  model?: string;
  output?: (payload: AnthropicExamplePayload) => void;
} = {}): Promise<AnthropicExamplePayload> {
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

  const anthropic =
    opts.anthropic ||
    new (await import("@anthropic-ai/sdk")).default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

  const adapter = createAnthropicMessagesAdapter({
    guard,
    client: anthropic,
  });

  const result = await adapter.create({
    model: opts.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content:
          "Review this refund request and decide whether an operator should approve the next step.",
      },
    ],
    metadata: {
      domain: "support",
      workflow: "refund-review",
      riskTier: "medium",
    },
  });

  const payload = {
    traceId: result.trace.trace_id,
    decision: result.trace.policy_evaluation?.decision,
    reason: result.trace.policy_evaluation?.reason,
    nextStep:
      "Open the Sentinos console, go to Traces, and search for the traceId above.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAnthropicGovernedMessagesExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
