# @sentinos/node

TypeScript and Node.js SDK for Sentinos.

`@sentinos/node` gives Node services and agent runtimes typed access to Sentinos Kernel, Arbiter, Chronos, Controlplane, Marketplace, trace forensics, alerts, incidents, and A2A handoff workflows.

## Install

```bash
npm install @sentinos/node
```

## Quickstart

```ts
import { JWTAuth, SentinosClient } from "@sentinos/node";

const client = SentinosClient.simple("https://api.sentinoshq.com", {
  orgId: "acme",
  auth: new JWTAuth(() => process.env.SENTINOS_ACCESS_TOKEN || ""),
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

## From Environment

```ts
import { SentinosClient } from "@sentinos/node";

const client = SentinosClient.fromEnv();
const trace = await client.kernel.getTrace("trace_123");
console.log(trace.decision);
```

Supported environment variables:

- `SENTINOS_BASE_URL` (aliases: `SENTINOS_API_URL`, `SENTINOS_URL`)
- `SENTINOS_KERNEL_URL`
- `SENTINOS_ARBITER_URL`
- `SENTINOS_CHRONOS_URL`
- `SENTINOS_CONTROLPLANE_URL`
- `SENTINOS_MESHGATE_URL`
- `SENTINOS_ORG_ID` (alias: `SENTINOS_TENANT_ID`)
- `SENTINOS_ACCESS_TOKEN`
- `SENTINOS_TIMEOUT_SECONDS`

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
  kernelUrl: "https://kernel.sentinoshq.com",
  arbiterUrl: "https://arbiter.sentinoshq.com",
  chronosUrl: "https://chronos.sentinoshq.com",
  controlplaneUrl: "https://app.sentinoshq.com",
  auth: new APIKeyAuth(process.env.SENTINOS_API_KEY || ""),
});
```

### Workforce access tokens

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

Additional workforce env vars:

- `SENTINOS_WORKFORCE_IDP_ISSUER`
- `SENTINOS_WORKFORCE_EXCHANGE_AUDIENCE`
- `SENTINOS_WORKFORCE_REQUESTED_TTL_MINUTES`

## Runtime integrations

The Node SDK includes `LLMGuard` plus provider adapters for:

- OpenAI chat completions
- OpenAI responses
- OpenRouter chat/responses
- Anthropic messages

```ts
import { createOpenAIResponsesAdapter, LLMGuard, SentinosClient } from "@sentinos/node";

const client = SentinosClient.fromEnv();
const guard = new LLMGuard({
  kernel: client.kernel,
  agentId: "assistant-1",
  sessionId: "sess-42",
});

const adapter = createOpenAIResponsesAdapter({
  guard,
  client: openai,
});

const result = await adapter.create({
  model: "gpt-4.1-mini",
  input: [{ role: "user", content: "summarize incidents" }],
});

console.log(result.trace.trace_id, result.trace.decision);
```

## Client surface

- `client.kernel`
- `client.arbiter`
- `client.chronos`
- `client.controlplane`
- `client.traces`
- `client.alerts`
- `client.incidents`
- `client.marketplace`
- `client.meshgate`

## Local parity proof

The package includes a local seed harness that exercises the live Docker stack via the SDK and produces console login artifacts.

```bash
npm run seed:demo
```

Artifacts are written to `${SENTINOS_SEED_OUTPUT_DIR:-$TMPDIR/sentinos_seed_demo}` and include:

- `latest_seed.json`
- `console_login.js`

## Development

```bash
npm install
npm run build
npm test
npm run seed:demo
```
