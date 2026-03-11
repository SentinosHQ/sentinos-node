import { describe, expect, it, vi } from "vitest";

import { JWTAuth, SentinosClient } from "../src";

type FetchCall = {
  url: string;
  init: RequestInit | undefined;
};

function createFetchHarness(responseBody: unknown = { ok: true }) {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;

  return { calls, fetchImpl };
}

function createClient(calls: FetchCall[], fetchImpl: typeof fetch) {
  return new SentinosClient({
    baseUrl: "https://api.sentinoshq.test",
    orgId: "acme-org",
    auth: new JWTAuth(() => "jwt-token"),
    fetchImpl,
  });
}

describe("Sentinos Node SDK route parity", () => {
  it("uses auth bootstrap endpoints without leaking bearer auth", async () => {
    const { calls, fetchImpl } = createFetchHarness({
      tokens: { access_token: "access", refresh_token: "refresh" },
    });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.registerUser({
      email: "sdk@example.com",
      password: "Sentinos!123",
      display_name: "SDK User",
    });
    await client.controlplane.loginPassword({
      email: "sdk@example.com",
      password: "Sentinos!123",
      org_id: "acme-org",
    });
    await client.controlplane.previewInvitation("invite-token");

    expect(calls).toHaveLength(3);
    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/auth/register");
    expect(calls[1]?.url).toBe("https://api.sentinoshq.test/v1/auth/login/password");
    expect(calls[2]?.url).toBe("https://api.sentinoshq.test/v1/invitations/preview");

    for (const call of calls) {
      const headers = new Headers(call.init?.headers);
      expect(headers.get("authorization")).toBeNull();
      expect(headers.get("x-tenant-id")).toBe("acme-org");
    }
  });

  it("matches the controlplane routes used by the console for invites, settings, workforce, audit, and dashboards", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.getInvite("org_123", "inv_123");
    await client.controlplane.cancelInvite("org_123", "inv_123");
    await client.controlplane.getLoginMethods("org_123");
    await client.controlplane.patchTeamSettings("org_123", { default_team_id: "team_default" });
    await client.controlplane.createWorkforceRolloutWave("org_123", {
      name: "Canary",
      mode: "CANARY",
      percent: 15,
      enabled: true,
    });
    await client.controlplane.rollbackWorkforceRolloutWave("org_123", "wave_123");
    await client.controlplane.listAuditNotableEvents("org_123", 25);
    await client.controlplane.cloneDashboard("org_123", "dsh_123", { name: "Cloned Board" });
    await client.controlplane.restoreDashboardVersion("org_123", "dsh_123", 3);
    await client.controlplane.importDashboard("org_123", { definition: { title: "Imported" } });
    await client.controlplane.exportDashboard("org_123", "dsh_123");

    const urls = calls.map((call) => call.url);
    expect(urls).toEqual([
      "https://api.sentinoshq.test/v1/orgs/org_123/invites/inv_123",
      "https://api.sentinoshq.test/v1/orgs/org_123/invites/inv_123/cancel",
      "https://api.sentinoshq.test/v1/orgs/org_123/settings/login-methods",
      "https://api.sentinoshq.test/v1/orgs/org_123/teams/settings",
      "https://api.sentinoshq.test/v1/orgs/org_123/workforce/rollout/waves",
      "https://api.sentinoshq.test/v1/orgs/org_123/workforce/rollout/waves/wave_123/rollback",
      "https://api.sentinoshq.test/v1/orgs/org_123/audit/notable-events?limit=25",
      "https://api.sentinoshq.test/v1/orgs/org_123/dashboards/dsh_123/clone",
      "https://api.sentinoshq.test/v1/orgs/org_123/dashboards/dsh_123/restore/3",
      "https://api.sentinoshq.test/v1/orgs/org_123/dashboards/import",
      "https://api.sentinoshq.test/v1/orgs/org_123/dashboards/dsh_123/export",
    ]);

    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual([
      "GET",
      "POST",
      "GET",
      "PATCH",
      "POST",
      "POST",
      "GET",
      "POST",
      "POST",
      "POST",
      "GET",
    ]);
  });

  it("matches membership role assignment semantics exposed by controlplane", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.assignRole("org_123", "role_123", "mem_123");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/orgs/org_123/roles/role_123/members/mem_123");
    expect(calls[0]?.init?.method ?? "GET").toBe("POST");
  });

  it("matches team membership route semantics exposed by controlplane", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.addTeamMembership("org_123", "team_123", {
      membership_id: "mem_123",
      team_role: "ADMIN",
      provisioned_by: "MANUAL",
      provisioned_by_id: "admin_123",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/orgs/org_123/teams/team_123/memberships");
    expect(calls[0]?.init?.method ?? "GET").toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      membership_id: "mem_123",
      team_role: "ADMIN",
      provisioned_by: "MANUAL",
      provisioned_by_id: "admin_123",
    });
  });

  it("matches the billing routes exposed by controlplane", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true, url: "https://checkout.stripe.test/session" });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.createBillingCheckoutSession("org_123", { price_id: "price_core" });
    await client.controlplane.createBillingPortalSession("org_123", {
      return_url: "https://app.sentinoshq.com/settings/billing",
    });

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/orgs/org_123/billing/checkout-session",
      "https://api.sentinoshq.test/v1/orgs/org_123/billing/customer-portal-session",
    ]);
    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual(["POST", "POST"]);
  });

  it("exposes explicit trace-forensics routes through client.traces", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.traces.getTrace("trace_123");
    await client.traces.listTraces({
      agent_id: "finance_bot",
      session_id: "sess_123",
      decision: "ESCALATE",
      limit: 25,
    });
    await client.traces.verifyTrace("trace_123");
    await client.traces.ledgerVerify("trace_123");
    await client.traces.replayTrace("trace_123", {
      policy_keys: ["finance.refund.v2"],
      include_explain: true,
    });
    await client.traces.getRetentionPolicy();
    await client.traces.updateRetentionPolicy({
      trace_days: 30,
      export_days: 14,
      ledger_days: 90,
    });
    await client.traces.getPrivacyPolicy();
    await client.traces.updatePrivacyPolicy({
      mode: "redact+seal",
      prompt_rules: ["pii"],
    });
    await client.traces.scanPrivacyPayload({
      prompt: "customer ssn 111-22-3333",
      args: { amount: 1200 },
    });
    await client.traces.enforceRetention({ dry_run: true });
    await client.traces.distributedTraceSummaries(10);
    await client.traces.exportTraces({
      agent_id: "finance_bot",
      decision: "ALLOW",
      limit: 100,
    });
    await client.traces.getExportJob("job_123");

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/trace/trace_123",
      "https://api.sentinoshq.test/v1/trace/search?agent_id=finance_bot&session_id=sess_123&decision=ESCALATE&limit=25",
      "https://api.sentinoshq.test/v1/trace/trace_123/verify",
      "https://api.sentinoshq.test/v1/trace/trace_123/ledger",
      "https://api.sentinoshq.test/v1/trace/trace_123/replay",
      "https://api.sentinoshq.test/v1/trace/retention",
      "https://api.sentinoshq.test/v1/trace/retention",
      "https://api.sentinoshq.test/v1/trace/privacy/policy",
      "https://api.sentinoshq.test/v1/trace/privacy/policy",
      "https://api.sentinoshq.test/v1/trace/privacy/scan",
      "https://api.sentinoshq.test/v1/trace/retention/enforce",
      "https://api.sentinoshq.test/v1/trace/distributed?limit=10",
      "https://api.sentinoshq.test/v1/trace/export",
      "https://api.sentinoshq.test/v1/trace/export/job/job_123",
    ]);

    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual([
      "GET",
      "GET",
      "GET",
      "GET",
      "POST",
      "GET",
      "PATCH",
      "GET",
      "PATCH",
      "POST",
      "POST",
      "GET",
      "POST",
      "GET",
    ]);

    expect(JSON.parse(String(calls[4]?.init?.body))).toEqual({
      policy_keys: ["finance.refund.v2"],
      include_explain: true,
    });
    expect(JSON.parse(String(calls[6]?.init?.body))).toEqual({
      trace_days: 30,
      export_days: 14,
      ledger_days: 90,
    });
    expect(JSON.parse(String(calls[8]?.init?.body))).toEqual({
      mode: "redact+seal",
      prompt_rules: ["pii"],
    });
    expect(JSON.parse(String(calls[9]?.init?.body))).toEqual({
      prompt: "customer ssn 111-22-3333",
      args: { amount: 1200 },
    });
    expect(JSON.parse(String(calls[10]?.init?.body))).toEqual({ dry_run: true });
    expect(JSON.parse(String(calls[12]?.init?.body))).toEqual({
      agent_id: "finance_bot",
      decision: "ALLOW",
      limit: 100,
    });
  });

  it("matches advanced kernel parity routes for gRPC execute, runtime metrics, control evidence, and chronos ingest status", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.kernel.grpcExecute({
      org_id: "acme-org",
      agent_id: "assistant-1",
      session_id: "sess_123",
      intent: { type: "tool_call", tool: "stripe.refund", args: { amount: 1200 } },
    });
    await client.kernel.getRuntimeMetrics();
    await client.kernel.complianceControlEvidenceReport({
      framework: "SOC2",
      from: "2026-03-01T00:00:00Z",
      to: "2026-03-10T00:00:00Z",
    });
    await client.kernel.getChronosIngest("ing_123");

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/kernel/grpc/execute",
      "https://api.sentinoshq.test/v1/kernel/metrics/runtime",
      "https://api.sentinoshq.test/v1/compliance/evidence/controls?framework=SOC2&from=2026-03-01T00%3A00%3A00Z&to=2026-03-10T00%3A00%3A00Z",
      "https://api.sentinoshq.test/v1/kernel/chronos/ingest/ing_123",
    ]);

    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual(["POST", "GET", "GET", "GET"]);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      org_id: "acme-org",
      agent_id: "assistant-1",
      session_id: "sess_123",
      intent: { type: "tool_call", tool: "stripe.refund", args: { amount: 1200 } },
    });
  });

  it("matches alerts acknowledge and kernel api-key revoke action routes", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.alerts.acknowledge("alert_123", "handled");
    await client.kernel.revokeApiKey("key_123");

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/alerts/alert_123/acknowledge",
      "https://api.sentinoshq.test/v1/kernel/api-keys/key_123/revoke",
    ]);
    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual(["POST", "POST"]);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ note: "handled" });
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({});
  });

  it("covers the remaining enterprise identity routes for SAML ACS and SCIM provisioning", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.controlplane.postSamlAcs("org_123", {
      RelayState: "relay-state",
      SAMLResponse: "base64-assertion",
    });
    await client.controlplane.listScimUsers();
    await client.controlplane.createScimUser({
      userName: "sdk.user@sentinos.demo",
      name: { givenName: "SDK", familyName: "User" },
    });
    await client.controlplane.getScimUser("user_123");
    await client.controlplane.patchScimUser("user_123", {
      Operations: [{ op: "replace", path: "active", value: true }],
    });
    await client.controlplane.deleteScimUser("user_123");
    await client.controlplane.listScimGroups();
    await client.controlplane.createScimGroup({
      displayName: "SDK Group",
      members: [{ value: "user_123" }],
    });
    await client.controlplane.patchScimGroup("group_123", {
      Operations: [{ op: "add", path: "members", value: [{ value: "user_123" }] }],
    });
    await client.controlplane.deleteScimGroup("group_123");

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/orgs/org_123/saml/acs",
      "https://api.sentinoshq.test/scim/v2/Users",
      "https://api.sentinoshq.test/scim/v2/Users",
      "https://api.sentinoshq.test/scim/v2/Users/user_123",
      "https://api.sentinoshq.test/scim/v2/Users/user_123",
      "https://api.sentinoshq.test/scim/v2/Users/user_123",
      "https://api.sentinoshq.test/scim/v2/Groups",
      "https://api.sentinoshq.test/scim/v2/Groups",
      "https://api.sentinoshq.test/scim/v2/Groups/group_123",
      "https://api.sentinoshq.test/scim/v2/Groups/group_123",
    ]);

    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual([
      "POST",
      "GET",
      "POST",
      "GET",
      "PATCH",
      "DELETE",
      "GET",
      "POST",
      "PATCH",
      "DELETE",
    ]);

    const acsHeaders = new Headers(calls[0]?.init?.headers);
    expect(acsHeaders.get("authorization")).toBeNull();
  });

  it("normalizes Chronos tenant-scoped bodies and temporal queries", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.chronos.coordinate({
      query: "triage hot path",
      anchors: ["mdm", "corp"],
      constraints: { require_fresh: true, min_confidence: 0.8 },
    });
    await client.chronos.filterSignal({
      decision_pattern: "prompt.contains",
      time_window: { from: "2026-03-01T00:00:00Z", to: "2026-03-09T00:00:00Z" },
    });
    await client.chronos.resolveFacts({
      entity_id: "customer:cust_14",
      property: "risk.score",
    });
    await client.chronos.queryAsOfValid(["node_1", "node_2"], "2026-03-09T12:00:00Z");
    await client.chronos.queryAsOfTx(["node_3"], "2026-03-09T12:00:00Z");

    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/chronos/coordinate");
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      tenant_id: "acme-org",
      query: "triage hot path",
      anchors: ["mdm", "corp"],
      constraints: { require_fresh: true, min_confidence: 0.8 },
    });

    expect(calls[1]?.url).toBe("https://api.sentinoshq.test/v1/chronos/filter/signal");
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
      tenant_id: "acme-org",
      decision_pattern: "prompt.contains",
      time_window: { from: "2026-03-01T00:00:00Z", to: "2026-03-09T00:00:00Z" },
    });

    expect(calls[2]?.url).toBe("https://api.sentinoshq.test/v1/chronos/resolve/facts");
    expect(JSON.parse(String(calls[2]?.init?.body))).toMatchObject({
      tenant_id: "acme-org",
      entity_id: "customer:cust_14",
      property: "risk.score",
    });

    expect(calls[3]?.url).toBe(
      "https://api.sentinoshq.test/v1/chronos/temporal/as-of-valid?node_ids=node_1%2Cnode_2&as_of=2026-03-09T12%3A00%3A00Z"
    );
    expect(calls[4]?.url).toBe(
      "https://api.sentinoshq.test/v1/chronos/temporal/as-of-tx?node_ids=node_3&as_of=2026-03-09T12%3A00%3A00Z"
    );
  });

  it("uses the marketplace authoring and review routes exposed by Arbiter", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.arbiter.getMarketplacePack("pack_123");
    await client.arbiter.createMarketplacePack({
      pack_id: "starter-pack",
      name: "Starter Pack",
      version: "v1.0.0",
      policies: [],
    });
    await client.arbiter.publishMarketplacePack("pack_123", { visibility_scope: "COMMUNITY" });
    await client.arbiter.listMarketplaceReviewQueue(50);
    await client.arbiter.reviewMarketplacePack("pack_123", {
      decision: "APPROVE",
      notes: "Looks good",
    });

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/marketplace/packs/pack_123",
      "https://api.sentinoshq.test/v1/marketplace/packs",
      "https://api.sentinoshq.test/v1/marketplace/packs/pack_123/publish",
      "https://api.sentinoshq.test/v1/marketplace/review-queue?limit=50",
      "https://api.sentinoshq.test/v1/marketplace/packs/pack_123/review",
    ]);
  });

  it("uses PUT for alert rule updates to match kernel governance routes", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.alerts.updateRule("rule_123", {
      tenantId: "org_123",
      name: "Updated rule",
      enabled: true,
    });

    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/alerts/rules/rule_123");
    expect(calls[0]?.init?.method ?? "GET").toBe("PUT");
  });

  it("uses PUT for incident updates", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.incidents.update("inc_123", {
      status: "INVESTIGATING",
      severity: "HIGH",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.sentinoshq.test/v1/incidents/inc_123");
    expect(calls[0]?.init?.method ?? "GET").toBe("PUT");
  });

  it("matches the kernel notification-channel contract exposed by integrations routes", async () => {
    const { calls, fetchImpl } = createFetchHarness({ ok: true });
    const client = createClient(calls, fetchImpl);

    await client.kernel.listNotificationChannels({ kind: "slack", limit: 20 });
    await client.kernel.getNotificationChannel("chan_123");
    await client.kernel.createNotificationChannel({
      kind: "email",
      label: "Primary email",
      config: { to: "ops@sentinos.demo" },
    });
    await client.kernel.updateNotificationChannel("chan_123", {
      kind: "email",
      label: "Primary email",
      config: { to: "soc@sentinos.demo" },
    });
    await client.kernel.deleteNotificationChannel("chan_123");
    await client.kernel.testNotificationChannel("chan_123", "probe");
    await client.kernel.validateNotificationChannel({
      kind: "webhook",
      config: { url: "https://hooks.sentinos.demo/test" },
    });

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.sentinoshq.test/v1/integrations/channels?kind=slack&limit=20",
      "https://api.sentinoshq.test/v1/integrations/channels/chan_123",
      "https://api.sentinoshq.test/v1/integrations/channels",
      "https://api.sentinoshq.test/v1/integrations/channels/chan_123",
      "https://api.sentinoshq.test/v1/integrations/channels/chan_123",
      "https://api.sentinoshq.test/v1/integrations/channels/chan_123/test",
      "https://api.sentinoshq.test/v1/integrations/channels/validate",
    ]);

    expect(calls.map((call) => call.init?.method ?? "GET")).toEqual([
      "GET",
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "POST",
      "POST",
    ]);
  });
});
