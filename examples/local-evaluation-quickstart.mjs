#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { SentinosClient } from "../dist/index.js";

function pickEmail(value) {
  if (!value || typeof value !== "object") return undefined;
  if (value.user && typeof value.user === "object" && typeof value.user.email === "string") {
    return value.user.email;
  }
  if (typeof value.email === "string") {
    return value.email;
  }
  return undefined;
}

export async function runLocalEvaluationQuickstartExample(opts = {}) {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: opts.orgId || process.env.SENTINOS_ORG_ID,
    });

  const orgId = opts.orgId || process.env.SENTINOS_ORG_ID || client?.config?.tenantId || "acme";
  const sessionId = opts.sessionId || process.env.SENTINOS_SESSION_ID || "sess-local-eval-quickstart";
  const agentId = opts.agentId || process.env.SENTINOS_AGENT_ID || "local-eval-agent";
  const appUrl = opts.appUrl || process.env.APP_URL || "http://127.0.0.1:4173";

  const me =
    opts.authMe ? await opts.authMe() : client.controlplane?.authMe ? await client.controlplane.authMe() : undefined;

  const executeResult = await (opts.execute ||
    (() =>
      client.kernel.execute({
        tenant_id: orgId,
        agent_id: agentId,
        session_id: sessionId,
        intent: {
          type: "tool_call",
          tool: "stripe.refund",
          args: {
            amount: 1800,
            currency: "USD",
            customer_id: "cust_local_eval",
            order_id: "order_local_eval",
          },
        },
        metadata: {
          source: "local-evaluation-quickstart",
          seeded: false,
          evaluation_path: "one-command-local-eval",
        },
      })))();

  const traceId = executeResult?.trace_id;
  if (!traceId) {
    throw new Error("kernel.execute did not return a trace_id");
  }

  const trace =
    opts.trace || (client.kernel?.getTrace ? await client.kernel.getTrace(traceId) : undefined);

  const payload = {
    orgId,
    actorEmail: pickEmail(me),
    traceId,
    decision: trace?.policy_evaluation?.decision,
    reason: trace?.policy_evaluation?.reason,
    consoleUrl: `${appUrl}/#traces`,
    dashboardUrl: `${appUrl}/#dashboard`,
    nextStep:
      "Open the Sentinos console, go to Traces, and search for the traceId above.",
  };

  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalEvaluationQuickstartExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
