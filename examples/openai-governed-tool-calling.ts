// Example application code for governed OpenAI Responses calls with Sentinos.
// The consuming app should have both `@sentinos/node` and `openai` installed.

import { pathToFileURL } from "node:url";

import { createOpenAIResponsesAdapter, LLMGuard, SentinosClient } from "@sentinos/node";

type OpenAIResponsesClient = {
  responses: {
    create(args: {
      model: string;
      input: unknown;
      [key: string]: unknown;
    }): Promise<unknown> | unknown;
  };
};

type OpenAIExamplePayload = {
  traceId: string;
  decision?: string;
  reason?: string;
  rationaleMode?: string;
  rationaleSummary?: string;
  nextStep: string;
};

export async function runOpenAIGovernedToolCallingExample(opts: {
  client?: { kernel: SentinosClient["kernel"] };
  openai?: OpenAIResponsesClient;
  model?: string;
  output?: (payload: OpenAIExamplePayload) => void;
} = {}): Promise<OpenAIExamplePayload> {
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

  const openai =
    opts.openai ||
    new (await import("openai")).default({
      apiKey: process.env.OPENAI_API_KEY,
    });

  const adapter = createOpenAIResponsesAdapter({
    guard,
    client: openai,
  });

  const result = await adapter.create({
    model: opts.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content:
          "Summarize this customer request and explain whether a refund tool should be called.",
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
    rationaleMode: result.trace.agent_rationale?.capture_mode,
    rationaleSummary: result.trace.agent_rationale?.summary,
    nextStep:
      "Open the Sentinos console, go to Traces, search for the traceId above, and inspect Agent Rationale.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOpenAIGovernedToolCallingExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
