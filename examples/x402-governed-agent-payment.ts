import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type KernelLike = Pick<SentinosClient["kernel"], "execute" | "getTrace" | "appendSessionEvent">;

type X402Requirement = {
  scheme: string;
  network: string;
  asset: string;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  description?: string;
};

type X402PaymentRequired = {
  x402Version: number;
  accepts: X402Requirement[];
};

type MockX402Response = {
  status: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

type AgenticPaymentPayload = {
  traceId: string;
  decision: string;
  rationaleMode?: string;
  rationaleSummary?: string;
  protocol: "x402";
  merchant: string;
  resource: string;
  amount: string;
  network: string;
  asset: string;
  settlementReference?: string;
  nextStep: string;
};

class MockX402Service {
  readonly merchant = "agentic-market-demo";
  readonly requirement: X402PaymentRequired = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base-sepolia",
        asset: "USDC",
        maxAmountRequired: "0.25",
        resource: "https://api.agentic-market.example/search/company-risk",
        payTo: "0x1111111111111111111111111111111111111111",
        description: "Company risk dataset lookup",
      },
    ],
  };

  async request(headers: Record<string, string> = {}): Promise<MockX402Response> {
    const payment = headers["PAYMENT-SIGNATURE"] || headers.PAYMENT || headers["X-PAYMENT"];
    if (!payment) {
      return {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(this.requirement), "utf8").toString("base64url"),
        },
        body: {
          error: "payment_required",
          merchant: this.merchant,
        },
      };
    }

    return {
      status: 200,
      headers: {
        "PAYMENT-RESPONSE": "settlement_mock_x402_base_sepolia_usdc_001",
      },
      body: {
        merchant: this.merchant,
        risk_score: "low",
        records: 3,
      },
    };
  }
}

function parsePaymentRequired(header: string | undefined): X402PaymentRequired {
  if (!header) {
    throw new Error("missing PAYMENT-REQUIRED header");
  }
  return JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as X402PaymentRequired;
}

function createMockPaymentProof(requirement: X402Requirement, walletId: string): string {
  return Buffer.from(
    JSON.stringify({
      x402Version: 1,
      scheme: requirement.scheme,
      network: requirement.network,
      asset: requirement.asset,
      resource: requirement.resource,
      wallet_id: walletId,
      authorization: "mock-signature-for-governed-example",
    }),
    "utf8",
  ).toString("base64url");
}

export async function runX402GovernedAgentPaymentExample(opts: {
  client?: { kernel: KernelLike };
  service?: MockX402Service;
  output?: (payload: AgenticPaymentPayload) => void;
} = {}): Promise<AgenticPaymentPayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });
  const service = opts.service || new MockX402Service();
  const tenantId = process.env.SENTINOS_ORG_ID || "acme";
  const agentId = process.env.SENTINOS_AGENT_ID || "procurement-agent";
  const sessionId = process.env.SENTINOS_SESSION_ID || `sess-x402-${Date.now()}`;

  const firstResponse = await service.request();
  if (firstResponse.status !== 402) {
    throw new Error(`expected mocked x402 service to return 402, got ${firstResponse.status}`);
  }

  const paymentRequired = parsePaymentRequired(firstResponse.headers["PAYMENT-REQUIRED"]);
  const requirement = paymentRequired.accepts[0];
  if (!requirement) {
    throw new Error("mocked x402 service returned no payment requirements");
  }

  const paymentContext = {
    protocol: "x402",
    merchant: service.merchant,
    resource: requirement.resource,
    scheme: requirement.scheme,
    network: requirement.network,
    asset: requirement.asset,
    amount: requirement.maxAmountRequired,
    pay_to: requirement.payTo,
    budget_window: {
      max_usd: "1.00",
      expires_in_seconds: 300,
    },
  };

  const executeResponse = await client.kernel.execute({
    tenant_id: tenantId,
    agent_id: agentId,
    session_id: sessionId,
    intent: {
      type: "payment_authorization",
      tool: "payment.x402",
      args: paymentContext,
    },
    metadata: {
      skip_connector: true,
      integration_kind: "agentic_payment",
      payment_context: paymentContext,
      agent_rationale: {
        capture_mode: "workflow_supplied",
        summary: "Authorize x402 payment proof attachment before requesting the paid resource.",
        goal: "Fetch the company risk dataset within the session budget.",
        decision_basis: [
          "Payment protocol: x402",
          `Merchant: ${service.merchant}`,
          `Resource: ${requirement.resource}`,
          `Amount: ${requirement.maxAmountRequired} ${requirement.asset}`,
        ],
        expected_outcome: "Attach payment proof only after Sentinos allows or shadows the authorization.",
        confidence: 0.82,
        risk_context: {
          data_class: "business",
          side_effects: ["payment_authorization", "external_api_access"],
          external_domains: ["api.agentic-market.example"],
          requires_approval: false,
        },
      },
    },
  });
  const trace = await client.kernel.getTrace(executeResponse.trace_id);
  const decision = String(trace.policy_evaluation?.decision || executeResponse.decision || "").toUpperCase();

  let settlementReference = "";
  if (decision === "ALLOW" || decision === "SHADOW") {
    const paymentProof = createMockPaymentProof(
      requirement,
      process.env.X402_WALLET_ID || "wallet_mock_agentic_payments",
    );
    const paidResponse = await service.request({ "PAYMENT-SIGNATURE": paymentProof });
    settlementReference = paidResponse.headers["PAYMENT-RESPONSE"] || "";

    await client.kernel.appendSessionEvent(sessionId, {
      type: "payment.x402",
      payload: {
        provider: "x402",
        operation: "pay",
        decision,
        trace_id: trace.trace_id,
        summary: {
          merchant: service.merchant,
          resource: requirement.resource,
          amount: requirement.maxAmountRequired,
          asset: requirement.asset,
          network: requirement.network,
          settlement_reference: settlementReference,
          response_status: paidResponse.status,
        },
      },
      tenantId,
      orgId: tenantId,
    });
  }

  const payload: AgenticPaymentPayload = {
    traceId: trace.trace_id,
    decision,
    rationaleMode: trace.agent_rationale?.capture_mode,
    rationaleSummary: trace.agent_rationale?.summary,
    protocol: "x402",
    merchant: service.merchant,
    resource: requirement.resource,
    amount: requirement.maxAmountRequired,
    network: requirement.network,
    asset: requirement.asset,
    settlementReference,
    nextStep:
      "Open the Sentinos console, search for the traceId in Traces, and inspect Agent Rationale before enabling live wallet settlement.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runX402GovernedAgentPaymentExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
