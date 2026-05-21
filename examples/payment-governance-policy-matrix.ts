import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type MatrixDecision = "ALLOW" | "ESCALATE" | "DENY" | "SHADOW";

type PaymentGovernanceScenario = {
  label: "allow" | "shadow" | "escalate" | "deny";
  expectedDecision: MatrixDecision;
  paymentContext: Record<string, unknown>;
};

type PaymentGovernanceMatrixPayload = {
  scenarios: Array<{
    label: PaymentGovernanceScenario["label"];
    traceId: string;
    decision: string;
    settlementReference: string;
  }>;
  proofBoundary: string;
};

const SCENARIOS: PaymentGovernanceScenario[] = [
  {
    label: "allow",
    expectedDecision: "ALLOW",
    paymentContext: {
      protocol: "x402",
      merchant: "agentic-market-demo",
      resource: "https://api.agentic-market.example/search/company-risk",
      scheme: "exact",
      network: "base-sepolia",
      asset: "USDC",
      amount: "0.25",
      pay_to: "0x1111111111111111111111111111111111111111",
      budget_window: { max_usd: "1.00", expires_in_seconds: 300 },
    },
  },
  {
    label: "shadow",
    expectedDecision: "SHADOW",
    paymentContext: {
      protocol: "x402",
      merchant: "agentic-market-demo",
      resource: "https://api.agentic-market.example/search/company-risk-shadow",
      scheme: "exact",
      network: "base-sepolia",
      asset: "USDC",
      amount: "0.10",
      pay_to: "0x1111111111111111111111111111111111111111",
      budget_window: { max_usd: "1.00", expires_in_seconds: 300 },
      enforcement_mode: "shadow",
    },
  },
  {
    label: "escalate",
    expectedDecision: "ESCALATE",
    paymentContext: {
      protocol: "x402",
      merchant: "agentic-market-demo",
      resource: "https://api.agentic-market.example/search/company-risk-premium",
      scheme: "exact",
      network: "base-sepolia",
      asset: "USDC",
      amount: "2.50",
      pay_to: "0x1111111111111111111111111111111111111111",
      budget_window: { max_usd: "1.00", expires_in_seconds: 300 },
    },
  },
  {
    label: "deny",
    expectedDecision: "DENY",
    paymentContext: {
      protocol: "x402",
      merchant: "unknown-market",
      resource: "https://api.unknown-market.example/paywalled-risk-feed",
      scheme: "exact",
      network: "base-sepolia",
      asset: "USDC",
      amount: "0.25",
      pay_to: "0x2222222222222222222222222222222222222222",
      budget_window: { max_usd: "1.00", expires_in_seconds: 300 },
    },
  },
];

export async function runPaymentGovernancePolicyMatrixExample(opts: {
  client?: { kernel: SentinosClient["kernel"] };
  output?: (payload: PaymentGovernanceMatrixPayload) => void;
} = {}): Promise<PaymentGovernanceMatrixPayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });
  const tenantId = process.env.SENTINOS_ORG_ID || "acme";
  const sessionId = process.env.SENTINOS_SESSION_ID || `sess-payment-matrix-${Date.now()}`;
  const results: PaymentGovernanceMatrixPayload["scenarios"] = [];

  for (const scenario of SCENARIOS) {
    const executeResponse = await client.kernel.execute({
      tenant_id: tenantId,
      agent_id: `payment-matrix-${scenario.label}`,
      session_id: `${sessionId}-${scenario.label}`,
      intent: {
        type: "payment_authorization",
        tool: "payment.x402",
        args: scenario.paymentContext,
      },
      metadata: {
        skip_connector: true,
        integration_kind: "agentic_payment",
        scenario: scenario.label,
        payment_context: scenario.paymentContext,
      },
    });
    const trace = await client.kernel.getTrace(executeResponse.trace_id);
    const decision = String(trace.policy_evaluation?.decision || executeResponse.decision || "").toUpperCase();
    if (decision !== scenario.expectedDecision) {
      throw new Error(`expected ${scenario.label} decision ${scenario.expectedDecision}, got ${decision}`);
    }

    let settlementReference = "";
    if (decision === "ALLOW" || decision === "SHADOW") {
      settlementReference = `settlement_mock_${scenario.label}_${trace.trace_id}`;
      await client.kernel.appendSessionEvent(`${sessionId}-${scenario.label}`, {
        type: "payment.x402",
        tenantId,
        orgId: tenantId,
        payload: {
          provider: "x402",
          operation: "pay",
          decision,
          trace_id: trace.trace_id,
          summary: {
            ...scenario.paymentContext,
            settlement_reference: settlementReference,
            response_status: 200,
          },
        },
      });
    }

    results.push({
      label: scenario.label,
      traceId: trace.trace_id,
      decision,
      settlementReference,
    });
  }

  const payload: PaymentGovernanceMatrixPayload = {
    scenarios: results,
    proofBoundary:
      "Provider-free governance proof only: mocked x402 payment contexts are evaluated through Sentinos, but no live wallet, facilitator, Coinbase, AWS AgentCore, or Stripe settlement is performed.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPaymentGovernancePolicyMatrixExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
