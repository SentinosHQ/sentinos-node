import { pathToFileURL } from "node:url";

import { LLMGuard, SentinosClient, makeGuardedTool } from "@sentinos/node";

type StripeClient = {
  refunds: {
    create(args: {
      payment_intent: string;
      amount: number;
      reason?: string;
      metadata?: Record<string, string>;
    }): Promise<Record<string, unknown>> | Record<string, unknown>;
  };
};

type StripeExamplePayload = {
  traceId: string;
  decision: string;
  refundId?: string;
  reason?: string;
  nextStep: string;
};

export async function runStripeGovernedRefundExample(opts: {
  client?: { kernel: SentinosClient["kernel"] };
  stripe?: StripeClient;
  output?: (payload: StripeExamplePayload) => void;
} = {}): Promise<StripeExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const guard = new LLMGuard({
    kernel: client.kernel,
    agentId: process.env.SENTINOS_AGENT_ID || "finance-refund-agent",
    sessionId: process.env.SENTINOS_SESSION_ID || `sess-${Date.now()}`,
  });

  const stripe =
    opts.stripe ||
    new (await import("stripe")).default(process.env.STRIPE_API_KEY || "", {
      apiVersion: "2025-03-31.basil",
    });

  const guardedRefund = makeGuardedTool({
    guard,
    toolName: "stripe.refund",
    metadata: (args: {
      payment_intent: string;
      amount: number;
      currency?: string;
      ticket_id?: string;
    }) => ({
      integration_kind: "financial_action",
      payment_context: {
        provider: "stripe",
        rail: "refund",
        payment_id: args.payment_intent,
        amount: String(args.amount),
        currency: args.currency || "USD",
        resource: args.ticket_id || "customer_refund",
      },
    }),
    execute: async (args: {
      payment_intent: string;
      amount: number;
      currency?: string;
      reason?: string;
      ticket_id?: string;
    }) =>
      stripe.refunds.create({
        payment_intent: args.payment_intent,
        amount: args.amount,
        reason: args.reason,
        metadata: args.ticket_id ? { ticket_id: args.ticket_id } : undefined,
      }),
  });

  const result = await guardedRefund({
    payment_intent: process.env.STRIPE_PAYMENT_INTENT || "pi_demo_refund",
    amount: Number(process.env.STRIPE_REFUND_AMOUNT || 1800),
    currency: process.env.STRIPE_REFUND_CURRENCY || "USD",
    reason: "requested_by_customer",
    ticket_id: "ticket-4012",
  });

  const payload = {
    traceId: result.trace_id,
    decision: result.decision,
    refundId: String((result.result as Record<string, unknown> | undefined)?.id || ""),
    reason: result.reason,
    nextStep:
      "Open the Sentinos console, search for the traceId in Traces, and inspect the decision, evidence, and any approval workflow tied to the refund attempt.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStripeGovernedRefundExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
