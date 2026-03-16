# `@sentinos/node`

![Sentinos Node SDK](https://raw.githubusercontent.com/SentinosHQ/sentinos-node/main/assets/og-default.png)

Official TypeScript-first SDK for Sentinos. Use it to govern agent actions, inspect decision traces, replay policy outcomes, and connect Node runtimes to Sentinos services from one typed client.

## Requirements

- Node.js **20** or newer (ESM runtime only)
- The package is shipped as an ES module, so your loader/build tooling must honor `type: "module"`

## Docs & resources

- [Sentinos SDK docs](https://docs.sentinoshq.com/sdk/)
- [Repository and API surface](https://github.com/SentinosHQ/sentinos-node)
- [Release notes](https://github.com/SentinosHQ/sentinos-node/releases)
- [Issue tracker](https://github.com/SentinosHQ/sentinos-node/issues)

## Quickstart

```bash
npm install @sentinos/node
```

Before you run the first request, make sure you have:

- a Sentinos API base URL such as `https://api.sentinos.ai`
- an organization id
- an access token or API key

```ts
import { JWTAuth, SentinosClient } from "@sentinos/node";

const client = SentinosClient.simple("https://api.sentinos.ai", {
  orgId: "acme",
  auth: new JWTAuth(async () => process.env.SENTINOS_ACCESS_TOKEN ?? ""),
});

const result = await client.kernel.execute({
  tenant_id: "acme",
  agent_id: "assistant-1",
  session_id: "sess-1",
  intent: {
    type: "tool_call",
    tool: "stripe.refund",
    args: { amount: 1200 },
  },
});

console.log(result.decision, result.trace_id);
```

`SentinosClient.simple` wires up the base URL, organization, and authentication so you can focus on orchestrating agents.

## Environment configuration

```ts
import { SentinosClient } from "@sentinos/node";

const client = SentinosClient.fromEnv();
```

The SDK honors the following environment variables:

- `SENTINOS_BASE_URL` (aliases: `SENTINOS_API_URL`, `SENTINOS_URL`)
- `SENTINOS_KERNEL_URL`
- `SENTINOS_ARBITER_URL`
- `SENTINOS_CHRONOS_URL`
- `SENTINOS_CONTROLPLANE_URL`
- `SENTINOS_MESHGATE_URL`
- `SENTINOS_ORG_ID` (alias: `SENTINOS_TENANT_ID`)
- `SENTINOS_ACCESS_TOKEN`
- `SENTINOS_TIMEOUT_SECONDS`

Workforce sessions add:

- `SENTINOS_WORKFORCE_IDP_ISSUER`
- `SENTINOS_WORKFORCE_EXCHANGE_AUDIENCE`
- `SENTINOS_WORKFORCE_REQUESTED_TTL_MINUTES`

## Authentication

### JWT

```ts
import { JWTAuth, SentinosClient } from "@sentinos/node";

const client = SentinosClient.fromEnv({
  orgId: "acme",
  auth: new JWTAuth(async () => getFreshOidcToken()),
});
```

### API Key

```ts
import { APIKeyAuth, SentinosClient } from "@sentinos/node";

const client = new SentinosClient({
  orgId: "acme",
  kernelUrl: process.env.SENTINOS_KERNEL_URL!,
  arbiterUrl: process.env.SENTINOS_ARBITER_URL!,
  chronosUrl: process.env.SENTINOS_CHRONOS_URL!,
  controlplaneUrl: process.env.SENTINOS_CONTROLPLANE_URL!,
  auth: new APIKeyAuth(process.env.SENTINOS_API_KEY ?? ""),
});
```

### Workforce tokens

```ts
import { SentinosClient, WorkforceTokenProvider } from "@sentinos/node";

const workforceAuth = WorkforceTokenProvider.fromEnv(async () => ({
  externalSubject: "user-123",
  email: "user@example.com",
  displayName: "Example User",
  groups: ["finance-reviewers"],
  assertionToken: process.env.IDP_ASSERTION,
}));

const client = SentinosClient.fromEnv({ auth: workforceAuth });
```

## Trace & replay workflow

Inspecting a trace and replaying it lets you verify why a decision landed where it did and capture evidence for auditors.

```ts
const trace = await client.traces.getTrace("trace_123");

const replay = await client.traces.replayTrace(trace.trace_id, {
  include_explain: true,
  environment_assumptions: { user_tier: "trial" },
});

console.log("replayed decision", replay.decision);
```

If you need a full forensic package, follow up with `client.traces.exportReplayEvidence(...)` or `client.traces.replayTraceMatrix(...)` to generate evidence-ready replay output.

## Runtime integrations

The SDK bundles `LLMGuard` plus adapters for OpenAI chat completions, OpenAI responses, OpenRouter, and Anthropic so you can anchor guardrails around any completion stream.

```ts
import { createOpenAIResponsesAdapter, LLMGuard, SentinosClient } from "@sentinos/node";

const client = SentinosClient.fromEnv();
const guard = new LLMGuard({
  kernel: client.kernel,
  agentId: "assistant-1",
  sessionId: "sess-42",
});

const adapter = createOpenAIResponsesAdapter({ guard, client: openai });

const result = await adapter.create({
  model: "gpt-4.1-mini",
  input: [{ role: "user", content: "summarize incidents" }],
});

console.log(result.trace.trace_id, result.trace.decision);
```

## Client surface

- `client.kernel` for governed execution and runtime operations
- `client.traces` for trace lookup, replay, export, cost, and lineage
- `client.arbiter` for policy lifecycle and simulation
- `client.chronos` for context snapshots and provenance
- `client.alerts`, `client.incidents`, `client.marketplace`, and `client.meshgate` for adjacent Sentinos workflows
