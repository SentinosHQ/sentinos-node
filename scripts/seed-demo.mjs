#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";

import { JWTAuth, SentinosClient } from "../dist/index.js";

const DEFAULTS = {
  appUrl: process.env.APP_URL || "http://127.0.0.1:4173",
  kernelUrl: process.env.KERNEL_URL || "http://localhost:8081",
  arbiterUrl: process.env.ARBITER_URL || "http://localhost:8082",
  chronosUrl: process.env.CHRONOS_URL || "http://localhost:8083",
  controlplaneUrl: process.env.CONTROLPLANE_URL || "http://localhost:18084",
  meshgateUrl: process.env.MESHGATE_URL || "http://localhost:8085",
  password: process.env.SENTINOS_DEMO_PASSWORD || "SentinosDemo!123",
  outputDir: process.env.SENTINOS_SEED_OUTPUT_DIR || path.join(os.tmpdir(), "sentinos_seed_demo"),
};

const nowIso = () => new Date().toISOString();

function log(message) {
  process.stdout.write(`==> ${message}\n`);
}

function warn(message) {
  process.stderr.write(`WARN: ${message}\n`);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}

function getFirstArray(value, key) {
  const record = asRecord(value);
  return Array.isArray(record[key]) ? record[key] : [];
}

function pick(value, paths, fallback = undefined) {
  for (const pathSpec of paths) {
    let current = value;
    let ok = true;
    for (const key of pathSpec) {
      if (!current || typeof current !== "object" || !(key in current)) {
        ok = false;
        break;
      }
      current = current[key];
    }
    if (ok && current !== undefined && current !== null && current !== "") {
      return current;
    }
  }
  return fallback;
}

function toCountArray(value, ...paths) {
  for (const pathSpec of paths) {
    const out = pick(value, [pathSpec]);
    if (Array.isArray(out)) {
      return out.length;
    }
  }
  return 0;
}

function toDecisionMix(items) {
  const counts = {};
  for (const item of items) {
    const decision = pick(item, [["decision"]], "UNKNOWN");
    counts[decision] = (counts[decision] || 0) + 1;
  }
  return counts;
}

async function postInternalAudit(controlplaneUrl, event, sourceService) {
  const response = await fetch(`${controlplaneUrl}/v1/internal/audit/events`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-sentinos-service": sourceService,
    },
    body: JSON.stringify({ event }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`internal audit ingest failed for ${sourceService}: HTTP ${response.status} ${text}`);
  }
  return response.json().catch(() => ({}));
}

async function writeArtifacts({
  outputDir,
  appUrl,
  orgId,
  adminEmail,
  adminPassword,
  browserTokens,
  services,
  summary,
  steps,
}) {
  await mkdir(outputDir, { recursive: true });
  const loginHelperPath = path.join(outputDir, "console_login.js");
  const summaryPath = path.join(outputDir, "latest_seed.json");

  const loginBody = JSON.stringify({
    email: adminEmail,
    password: adminPassword,
    org_id: orgId,
  });

  const loginHelper = `(async () => {
  const loginBody = ${loginBody};
  const res = await fetch("/__api/controlplane/v1/auth/login/password", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(loginBody),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Seed login failed: " + res.status + " " + text);
  }
  const body = await res.json();
  const tokens = body.tokens || {};
  if (!tokens.access_token) throw new Error("Seed login response missing access_token");
  localStorage.setItem("sentinos_token", tokens.access_token);
  localStorage.setItem("sentinos_tenant_id", tokens.org_id || ${JSON.stringify(orgId)});
  if (tokens.refresh_token) localStorage.setItem("sentinos_refresh_token", tokens.refresh_token);
  if (tokens.expires_at) localStorage.setItem("sentinos_token_expires_at_ms", String(Date.parse(tokens.expires_at)));
  if (tokens.session_id) localStorage.setItem("sentinos_session_id", tokens.session_id);
  window.location.assign("/#dashboard");
})().catch((err) => {
  console.error(err);
  alert(String(err && err.message ? err.message : err));
});
`;

  await writeFile(loginHelperPath, loginHelper, "utf8");
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        tenant_id: orgId,
        services,
        console_access: {
          login_url: `${appUrl}/auth/login`,
          login_helper_js: loginHelperPath,
          admin_email: adminEmail,
          admin_password: adminPassword,
          org_id: orgId,
          browser_tokens: browserTokens,
        },
        summary,
        steps,
      },
      null,
      2,
    ),
    "utf8",
  );

  return { loginHelperPath, summaryPath };
}

async function main() {
  const startedAt = Date.now();
  const runId = `node-sdk-seed-${Date.now()}`;
  const adminEmail = `admin+${runId}@sentinos.demo`;
  const adminPassword = DEFAULTS.password;
  const orgName = `Sentinos Node SDK Demo ${new Date().toISOString().slice(0, 16)}`;

  const anonymous = new SentinosClient({
    kernelUrl: DEFAULTS.kernelUrl,
    arbiterUrl: DEFAULTS.arbiterUrl,
    chronosUrl: DEFAULTS.chronosUrl,
    controlplaneUrl: DEFAULTS.controlplaneUrl,
    meshgateUrl: DEFAULTS.meshgateUrl,
  });

  const stepResults = [];
  const state = {
    orgId: "",
    browserTokens: {},
    adminClient: null,
    roleIds: {},
    teamIds: {},
    workforceUsers: [],
    traceIds: [],
    alertRuleIds: [],
    dashboardIds: [],
    channelIds: [],
    waveIds: [],
    packId: "",
    snapshotId: "",
    queryId: "",
  };

  async function step(name, fn, { required = true } = {}) {
    const started = Date.now();
    try {
      const value = await fn();
      stepResults.push({
        name,
        status: "ok",
        required,
        duration_ms: Date.now() - started,
      });
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stepResults.push({
        name,
        status: required ? "failed" : "skipped",
        required,
        duration_ms: Date.now() - started,
        error: message,
      });
      if (required) {
        throw error;
      }
      warn(`${name}: ${message}`);
      return undefined;
    }
  }

  const register = await step("register user + org", async () => {
    const result = await anonymous.controlplane.registerUser({
      email: adminEmail,
      password: adminPassword,
      display_name: "Sentinos Node SDK Admin",
    });
    state.orgId = pick(result, [["organization", "org_id"], ["organization", "id"]], "");
    if (!state.orgId) {
      throw new Error("register response missing organization org_id");
    }
    state.browserTokens = {
      access_token: pick(result, [["tokens", "access_token"]], ""),
      refresh_token: pick(result, [["tokens", "refresh_token"]], ""),
      expires_at: pick(result, [["tokens", "expires_at"]], ""),
      session_id: pick(result, [["tokens", "session_id"]], ""),
    };
    return result;
  });

  await step("password login for browser artifact", async () => {
    const result = await anonymous.controlplane.loginPassword({
      email: adminEmail,
      password: adminPassword,
      org_id: state.orgId,
    });
    state.browserTokens = {
      access_token: pick(result, [["tokens", "access_token"]], ""),
      refresh_token: pick(result, [["tokens", "refresh_token"]], ""),
      expires_at: pick(result, [["tokens", "expires_at"]], ""),
      session_id: pick(result, [["tokens", "session_id"]], ""),
    };
    if (!state.browserTokens.access_token) {
      throw new Error("login response missing access token");
    }
    state.adminClient = new SentinosClient({
      kernelUrl: DEFAULTS.kernelUrl,
      arbiterUrl: DEFAULTS.arbiterUrl,
      chronosUrl: DEFAULTS.chronosUrl,
      controlplaneUrl: DEFAULTS.controlplaneUrl,
      meshgateUrl: DEFAULTS.meshgateUrl,
      orgId: state.orgId,
      auth: new JWTAuth(() => state.browserTokens.access_token),
    });
    return result;
  });

  const admin = () => {
    if (!state.adminClient) {
      throw new Error("admin client not initialized");
    }
    return state.adminClient;
  };

  await step("seed roles and teams", async () => {
    const client = admin();
    const permissions = (await client.controlplane.listPermissions()).permissions || [];
    const roles = (await client.controlplane.listRoles(state.orgId)).roles || [];
    const teams = (await client.controlplane.listTeams(state.orgId)).teams || [];

    for (const role of roles) {
      if (role.slug) state.roleIds[role.slug] = role.role_id;
    }

    const wantRoles = [
      { name: "SOC Analyst", slug: "soc_analyst" },
      { name: "Developer", slug: "developer" },
      { name: "Auditor", slug: "auditor" },
      { name: "Read Only", slug: "read_only" },
    ];
    for (const roleDef of wantRoles) {
      if (state.roleIds[roleDef.slug]) continue;
      const created = await client.controlplane.createRole(state.orgId, {
        name: roleDef.name,
        slug: roleDef.slug,
        permissions,
      });
      state.roleIds[roleDef.slug] = created.role_id;
    }

    for (const team of teams) {
      if (team.handle) state.teamIds[team.handle] = team.team_id;
    }
    const wantTeams = [
      { name: "SOC Operations", handle: "soc" },
      { name: "Platform Engineering", handle: "platform" },
    ];
    for (const teamDef of wantTeams) {
      if (state.teamIds[teamDef.handle]) continue;
      const created = await client.controlplane.createTeam(state.orgId, {
        name: teamDef.name,
        handle: teamDef.handle,
        description: `Created by ${runId}`,
      });
      state.teamIds[teamDef.handle] = created.team_id;
    }
  });

  await step("seed login methods and workforce policy", async () => {
    const client = admin();
    await client.controlplane.patchLoginMethods(state.orgId, {
      password_enabled: true,
      google_oidc_enabled: true,
      saml_enabled: true,
      saml_strict: false,
      allow_user_override: true,
      jit_provisioning_enabled: true,
      workforce_exchange_enabled: true,
      workforce_allowed_idps: ["https://idp.sentinos.demo"],
      scim_jit_precedence: "SCIM_FIRST",
    });
    await client.controlplane.patchWorkforcePolicy(state.orgId, {
      enabled: true,
      policy_name: "Enterprise Workforce Baseline",
      allowed_idps: ["https://idp.sentinos.demo"],
      allowed_email_domains: ["sentinos.demo", "example.com"],
      required_group_rules_json: { any_of: ["sentinos-employees", "sentinos-soc", "sentinos-platform"] },
      required_endpoint_signals_json: {
        require_managed: true,
        allowed_trust_levels: ["high", "medium"],
        max_risk_score: 60,
        required_tags: ["corp", "mdm"],
      },
      default_role_id: state.roleIds.developer,
      session_ttl_minutes: 45,
      max_session_ttl_minutes: 180,
      token_binding_mode: "OPTIONAL",
    });

    await client.controlplane.createWorkforceMapping(state.orgId, {
      external_group: "sentinos-soc",
      target_role_id: state.roleIds.soc_analyst,
      target_team_id: state.teamIds.soc,
      priority: 10,
      deny_on_match: false,
    });
    await client.controlplane.createWorkforceMapping(state.orgId, {
      external_group: "sentinos-platform",
      target_role_id: state.roleIds.developer,
      target_team_id: state.teamIds.platform,
      priority: 20,
      deny_on_match: false,
    });
    await client.controlplane.createWorkforceMapping(state.orgId, {
      external_group: "sentinos-blocked",
      priority: 5,
      deny_on_match: true,
    });
  });

  await step("seed workforce exchanges", async () => {
    const users = [
      ["wrk_emp_001", "employee1@sentinos.demo", "Seed Workforce Employee 1", ["sentinos-employees", "sentinos-platform"], "high", 22, ["corp", "mdm", "windows"], 50, "macbook-pro-15"],
      ["wrk_emp_002", "employee2@sentinos.demo", "Seed Workforce Employee 2", ["sentinos-employees", "sentinos-soc"], "medium", 37, ["corp", "mdm", "macos"], 45, "macbook-air-13"],
      ["wrk_emp_003", "employee3@sentinos.demo", "Seed Workforce Employee 3", ["sentinos-employees", "sentinos-platform"], "high", 18, ["corp", "mdm", "linux"], 60, "thinkpad-x1"],
      ["wrk_emp_004", "employee4@sentinos.demo", "Seed Workforce Employee 4", ["sentinos-employees"], "medium", 28, ["corp", "mdm", "browser"], 40, "browser-session-04"],
      ["wrk_emp_005", "employee5@sentinos.demo", "Seed Workforce Employee 5", ["sentinos-employees", "sentinos-soc"], "high", 15, ["corp", "mdm", "ipad"], 55, "ipad-pro-12"],
      ["wrk_emp_006", "employee6@sentinos.demo", "Seed Workforce Employee 6", ["sentinos-employees", "sentinos-platform"], "medium", 33, ["corp", "mdm", "windows"], 35, "surface-laptop-6"],
    ];

    for (const [subject, email, displayName, groups, trustLevel, riskScore, tags, ttl, deviceId] of users) {
      const tokens = await admin().controlplane.workforceTokenExchange({
        org_id: state.orgId,
        idp_issuer: "https://idp.sentinos.demo",
        external_subject: subject,
        email,
        display_name: displayName,
        groups,
        requested_ttl_minutes: ttl,
        device_id: deviceId,
        endpoint_signals: {
          managed: true,
          trust_level: trustLevel,
          risk_score: riskScore,
          tags,
        },
      });
      state.workforceUsers.push({
        subject,
        email,
        display_name: displayName,
        access_token: pick(tokens, [["access_token"]], ""),
        refresh_token: pick(tokens, [["refresh_token"]], ""),
        session_id: pick(tokens, [["session_id"]], ""),
        principal_id: pick(tokens, [["principal_id"]], ""),
      });
    }

    if (state.workforceUsers[0]?.refresh_token) {
      await admin().controlplane.workforceTokenRefresh(state.workforceUsers[0].refresh_token);
    }
  });

  await step("seed workforce rollout", async () => {
    const client = admin();
    const waveA = await client.controlplane.createWorkforceRolloutWave(state.orgId, {
      name: "Canary - SOC + Platform",
      mode: "CANARY",
      enabled: true,
      percent: 15,
      allowed_email_domains: ["sentinos.demo"],
      allowed_groups: ["sentinos-soc", "sentinos-platform"],
    });
    const waveB = await client.controlplane.createWorkforceRolloutWave(state.orgId, {
      name: "Expand - Employees",
      mode: "ENABLE",
      enabled: true,
      percent: 45,
      allowed_email_domains: ["sentinos.demo", "example.com"],
      allowed_groups: ["sentinos-employees"],
    });
    const waveC = await client.controlplane.createWorkforceRolloutWave(state.orgId, {
      name: "Rollback Exercise",
      mode: "CANARY",
      enabled: true,
      percent: 20,
      allowed_email_domains: ["example.com"],
      allowed_groups: ["sentinos-soc"],
    });
    state.waveIds = [waveA.wave_id, waveB.wave_id, waveC.wave_id].filter(Boolean);
    if (waveA.wave_id) {
      await client.controlplane.patchWorkforceRolloutWave(state.orgId, waveA.wave_id, {
        percent: 20,
        enabled: true,
        mode: "CANARY",
      });
    }
    if (waveC.wave_id) {
      await client.controlplane.rollbackWorkforceRolloutWave(state.orgId, waveC.wave_id);
    }
  });

  await step("seed arbiter policy + marketplace", async () => {
    const client = admin();
    await client.arbiter.upsertTenantConfig(
      {
        shadow_mode: false,
        fail_open: false,
        seeded: true,
        runtime_profile: "node-sdk-demo",
        notifications_default_severity: "MEDIUM",
      },
      state.orgId,
    );
    const policies = [
      {
        policy_id: `seed.finance.refund.${slug(runId)}`,
        rego: `package sentinos.seed.finance.refund.${slug(runId).replace(/-/g, "_")}\nimport rego.v1\n\ndefault decision := {"decision": "DENY", "reason": "default deny", "evidence": []}\n\ndecision := {"decision": "ALLOW", "reason": "seeded refund allow", "evidence": [{"seeded": true}]} if input.intent.tool == "stripe.refund"\n`,
        tool: "stripe.refund",
      },
      {
        policy_id: `seed.workforce.review.${slug(runId)}`,
        rego: `package sentinos.seed.workforce.review.${slug(runId).replace(/-/g, "_")}\nimport rego.v1\n\ndefault decision := {"decision": "DENY", "reason": "seeded review requires marker", "evidence": []}\n\ndecision := {"decision": "ALLOW", "reason": "seeded workforce review allowed", "evidence": [{"seeded": true}]} if input.metadata.seeded == true\n`,
        tool: "support.reply",
      },
    ];
    for (const policy of policies) {
      await client.arbiter.upsertPolicy({
        metadata: {
          policy_id: policy.policy_id,
          version: "v1",
          owner: "node-sdk-seed",
          scope: { target_tools: [policy.tool], tenants: ["*"] },
          language: "rego",
          source: "rego",
          created_at: nowIso(),
          verification_report: { status: "PASS" },
        },
        rego: policy.rego,
        status: "draft",
      });
    }
    const compile = await client.arbiter.compile({
      rego: policies[0].rego,
      policy_id: policies[0].policy_id,
      target_tools: [policies[0].tool],
      owner: "node-sdk-seed",
      severity: "medium",
    });
    await client.arbiter.verify({
      policy_id: policies[0].policy_id,
      version: "v1",
      policy_dsl: compile.policy_dsl,
      candidate_rego: compile.candidate_rego ?? policies[0].rego,
      testcases: compile.testcases ?? [],
    });
    await client.arbiter.simulate({
      tenant_id: state.orgId,
      candidate_rego: policies[0].rego,
      policy_id: policies[0].policy_id,
      version: "v1",
      trace_limit: 25,
    });

    const packId = `sentinos-node-pack-${slug(runId)}`;
    state.packId = packId;
    await client.marketplace.listPacks({ verified_only: false });
    await client.arbiter.createMarketplacePack({
      pack_id: packId,
      name: "Node SDK Seed Pack",
      version: "0.1.0",
      description: `Seeded by ${runId}`,
      author: "Sentinos",
      visibility_scope: "TENANT",
      tags: ["seed", "node-sdk"],
      policies: policies.map((policy) => ({
        policy_id: policy.policy_id,
        rego: policy.rego,
        metadata: {
          policy_id: policy.policy_id,
          version: "v1",
          owner: "node-sdk-seed",
          scope: { target_tools: [policy.tool], tenants: ["*"] },
          language: "rego",
          source: "rego",
          created_at: nowIso(),
          verification_report: { status: "PASS" },
        },
      })),
    });
    await client.arbiter.publishMarketplacePack(packId, { visibility_scope: "TENANT" });
    try {
      await client.marketplace.installPack(packId, { target_status: "staging", skip_simulation: true, trace_limit: 50 });
    } catch (error) {
      warn(`marketplace install skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, { required: false });

  await step("seed trace retention + privacy", async () => {
    const client = admin();
    await client.kernel.updateTraceRetentionPolicy({
      trace_days: 180,
      export_days: 90,
      ledger_days: 3650,
    });
    await client.kernel.updateTracePrivacyPolicy({
      enabled: true,
      default_class: "INTERNAL",
      export_redaction_enabled: true,
      write_redaction_enabled: true,
      write_sealing_enabled: true,
      retention_by_class: {
        PUBLIC: 30,
        INTERNAL: 120,
        CONFIDENTIAL: 90,
        REGULATED: 45,
        SECRET: 14,
      },
      residency_by_class: {},
      telemetry_egress_allowlist: ["logs.sentinos.ai", "siem.sentinos.ai"],
    });
    await client.kernel.scanTracePrivacyPayload({
      data_class: "REGULATED",
      payload: {
        prompt: "Process invoice for jdoe@sentinos.demo ssn 111-22-3333",
        tool_args: {
          amount: 1200,
          customer_email: "jdoe@sentinos.demo",
          account_id: "acc-77881",
        },
      },
    });
    await client.kernel.enforceTraceRetention(true);
  });

  await step("seed notification channels + alert rules", async () => {
    const client = admin();
    const channels = [
      { kind: "SLACK", name: "seed-slack", config: { webhook_url: "https://example.com/hooks/sentinos/slack" } },
      { kind: "PAGERDUTY", name: "seed-pagerduty", config: { routing_key: "seed-routing-key", events_api_url: "https://events.pagerduty.com/v2/enqueue" } },
      { kind: "WEBHOOK", name: "seed-webhook", config: { url: "https://example.com/hooks/sentinos/webhook", method: "POST" } },
      { kind: "EMAIL", name: "seed-email", config: { provider: "smtp", from: "alerts@sentinos.dev", to: ["soc@sentinos.dev"], host: "smtp.example.com", port: 587 } },
    ];

    for (const channel of channels) {
      await client.kernel.validateNotificationChannel({ kind: channel.kind, config: channel.config });
      const created = await client.kernel.createNotificationChannel(channel);
      const channelId = pick(created, [["channel_id"], ["id"], ["channel", "channel_id"]], "");
      if (channelId) state.channelIds.push(channelId);
    }
    await client.kernel.listNotificationChannels({ limit: 50 });

    const rules = [
      {
        name: "Seed Deny Threshold",
        rule_type: "THRESHOLD",
        severity: "HIGH",
        enabled: true,
        metric_key: "decision.deny_count",
        comparator: ">=",
        threshold_value: 1,
        evaluation_window_sec: 300,
        cooldown_sec: 120,
        notification_channels: state.channelIds.slice(0, 2),
        metadata: { seeded: true },
      },
      {
        name: "Seed Fraud Pattern",
        rule_type: "PATTERN",
        severity: "CRITICAL",
        enabled: true,
        pattern: "fraud_",
        threshold_value: 1,
        evaluation_window_sec: 300,
        cooldown_sec: 120,
        notification_channels: state.channelIds.slice(0, 1),
        metadata: { seeded: true },
      },
    ];
    for (const rule of rules) {
      const created = await client.alerts.createRule(rule);
      const ruleId = pick(created, [["rule_id"], ["id"]], "");
      if (ruleId) state.alertRuleIds.push(ruleId);
    }
    await client.alerts.listRules({ limit: 50 });
  }, { required: false });

  await step("seed autonomy sessions", async () => {
    const client = admin();
    const autonomyIds = [
      `auto_${slug(runId)}_active`,
      `auto_${slug(runId)}_paused`,
      `auto_${slug(runId)}_terminated`,
    ];
    await client.kernel.createAutonomySession({
      agent_id: "finance_bot_01",
      session_id: autonomyIds[0],
      risk_budget_snapshot: {
        max_runtime_seconds: 240,
        max_tool_calls: 120,
        max_external_domains: 8,
        max_data_egress_bytes: 900000,
        max_token_spend_usd: 35,
        approval_on_privilege_escalation: true,
      },
      metadata: { seeded: true, mode: "governed" },
    });
    await client.kernel.createAutonomySession({
      agent_id: "risk_bot_01",
      session_id: autonomyIds[1],
      risk_budget_snapshot: {
        max_runtime_seconds: 60,
        max_tool_calls: 40,
        max_external_domains: 3,
        max_data_egress_bytes: 250000,
        max_token_spend_usd: 8.5,
      },
      metadata: { seeded: true, mode: "triage" },
    });
    await client.kernel.pauseAutonomySession(autonomyIds[1], "seed paused for control-room view");
    await client.kernel.createAutonomySession({
      agent_id: "ops_bot_01",
      session_id: autonomyIds[2],
      risk_budget_snapshot: {
        max_runtime_seconds: 30,
        max_tool_calls: 15,
        max_external_domains: 2,
        max_data_egress_bytes: 120000,
        max_token_spend_usd: 5,
      },
      metadata: { seeded: true, mode: "sandbox" },
    });
    await client.kernel.terminateAutonomySession(autonomyIds[2], "seed terminated for lifecycle coverage");
    await client.kernel.patchAutonomySession(autonomyIds[0], {
      budget_violation_reason: "risk_budget_exceeded",
      risk_budget_snapshot: {
        max_runtime_seconds: 180,
        max_tool_calls: 90,
        max_external_domains: 6,
        max_data_egress_bytes: 750000,
        max_token_spend_usd: 22,
        approval_on_privilege_escalation: true,
      },
      metadata: { seeded: true, mode: "governed", runbook: "a2a_approval_required" },
    });
  });

  await step("seed meshgate handoffs", async () => {
    const client = admin();
    await client.meshgate.authorizeHandoff({
      tenant_id: state.orgId,
      sender_agent: "finance_bot_01",
      receiver_agent: "refund_service",
      session_id: "sess_demo_main",
      classification: "INTERNAL",
      policy_keys: ["handoff.forward.v3"],
      decision: "ALLOW",
      metadata: { seeded: true },
    });
    await client.meshgate.forwardHandoff({
      tenant_id: state.orgId,
      sender_agent: "finance_bot_01",
      receiver_agent: "finance_mgr",
      session_id: "sess_demo_main",
      classification: "CONFIDENTIAL",
      policy_keys: ["handoff.approval.v2"],
      decision: "ESCALATE",
      metadata: { seeded: true },
    });
    await client.meshgate.listTrustScores({ limit: 200 });
  }, { required: false });

  await step("seed kernel traces", async () => {
    const client = admin();
    const sessions = ["sess_demo_main", "sess_demo_aux_1", "sess_demo_aux_2"];
    const agents = ["finance_bot_01", "risk_bot_01", "ops_bot_01"];
    for (let i = 0; i < 12; i += 1) {
      const resp = await client.kernel.execute({
        tenant_id: state.orgId,
        agent_id: agents[i % agents.length],
        session_id: sessions[i % sessions.length],
        intent: {
          type: "tool_call",
          tool: "stripe.refund",
          args: {
            amount: 180 + (i % 6) * 35,
            currency: "USD",
            customer_id: `cust_${i + 1}`,
          },
        },
        metadata: { seeded: true, phase: "baseline" },
      });
      if (resp.trace_id) state.traceIds.push(resp.trace_id);
    }

    for (let i = 0; i < state.workforceUsers.length; i += 1) {
      const workforceUser = state.workforceUsers[i];
      if (!workforceUser.access_token || !workforceUser.session_id) continue;
      const workforceClient = new SentinosClient({
        kernelUrl: DEFAULTS.kernelUrl,
        arbiterUrl: DEFAULTS.arbiterUrl,
        chronosUrl: DEFAULTS.chronosUrl,
        controlplaneUrl: DEFAULTS.controlplaneUrl,
        meshgateUrl: DEFAULTS.meshgateUrl,
        orgId: state.orgId,
        auth: new JWTAuth(() => workforceUser.access_token),
      });
      const resp = await workforceClient.kernel.execute({
        tenant_id: state.orgId,
        agent_id: `employee_agent_${String(i + 1).padStart(2, "0")}`,
        session_id: workforceUser.session_id,
        intent: {
          type: "tool_call",
          tool: "stripe.refund",
          args: {
            amount: 210 + (i + 1) * 55,
            currency: "USD",
            customer_id: `wrk_cust_${i + 1}`,
            employee: workforceUser.subject,
          },
        },
        metadata: {
          seeded: true,
          phase: "workforce-demo",
          workforce_subject: workforceUser.subject,
          workforce_principal_id: workforceUser.principal_id,
          employee_no: i + 1,
        },
      });
      if (resp.trace_id) state.traceIds.push(resp.trace_id);
    }

    if (state.workforceUsers[1]?.session_id) {
      await admin().controlplane.revokeWorkforceSession(state.orgId, state.workforceUsers[1].session_id);
    }
  });

  await step("seed incidents", async () => {
    const client = admin();
    const incident = await client.incidents.create({
      title: "Seeded runtime investigation",
      severity: "HIGH",
      status: "OPEN",
      description: "Created by Node SDK seed harness for console validation.",
      source: "seed-demo",
      metadata: { seeded: true, run_id: runId },
    });
    const incidentId = pick(incident, [["incident_id"], ["id"]], "");
    if (incidentId) {
      await client.incidents.get(incidentId);
    }
  }, { required: false });

  await step("seed chronos context", async () => {
    const client = admin();
    const eventBodies = [
      {
        tenant_id: state.orgId,
        event_type: "decision_trace",
        source: "kernel",
        entity_id: `customer:cust_seed_${slug(runId)}`,
        payload: {
          trace_id: state.traceIds[0],
          session_id: "sess_demo_main",
          agent_id: "finance_bot_01",
          decision: "ALLOW",
          tool: "stripe.refund",
        },
      },
      {
        tenant_id: state.orgId,
        event_type: "identity_event",
        source: "workforce",
        entity_id: `customer:cust_seed_${slug(runId)}`,
        payload: {
          principal_id: state.workforceUsers[0]?.principal_id,
          session_id: state.workforceUsers[0]?.session_id,
          subject: state.workforceUsers[0]?.subject,
        },
      },
    ];
    for (const body of eventBodies) {
      await client.chronos.ingestEvent(body);
    }
    await client.chronos.ingestConnectorEvent({
      tenant_id: state.orgId,
      source_id: "slack",
      event_type: "account.updated",
      payload: {
        event_type: "message.posted",
        channel: "risk-ops",
        entity_id: `customer:cust_seed_${slug(runId)}`,
        owner: "success-team",
        risk_tier: "elevated",
      },
    });

    const snapshot = await client.chronos.createSnapshot({
      anchors: [`customer:cust_seed_${slug(runId)}`],
      depth: 2,
      include_decision_traces: true,
    });
    state.snapshotId = pick(snapshot, [["snapshot_id"], ["id"]], "");
    const query = await client.chronos.query({
      query: `customer:cust_seed_${slug(runId)}`,
      depth: 2,
      limit: 50,
      include_decision_traces: true,
    });
    state.queryId = pick(query, [["query_id"]], "");
    if (state.snapshotId) {
      await client.chronos.getSnapshot(state.snapshotId);
    }
    await client.chronos.getIngestStatus();
    await client.chronos.observabilityTraces({ limit: 25 });
    await client.chronos.observabilityAnomalies({ limit: 25 });
    await client.chronos.observabilityPatterns({ limit: 25 });
    await client.chronos.connectorHealth();
  }, { required: false });

  await step("seed unified audit + dashboards", async () => {
    const client = admin();
    const events = [
      {
        source_service: "kernel",
        category: "runtime",
        action: "KERNEL_EXECUTE_ESCALATED",
        outcome: "ESCALATE",
        severity: "HIGH",
        actor: { actor_type: "service", actor_id: "finance_bot_01", actor_label: "finance_bot_01" },
        target: { resource_type: "trace", resource_id: state.traceIds[0] || `trace_${slug(runId)}` },
        context: { trace_id: state.traceIds[0] || `trace_${slug(runId)}`, session_id: "sess_demo_main", request_id: randomUUID() },
      },
      {
        source_service: "controlplane",
        category: "identity",
        action: "WORKFORCE_SUBJECT_PROVISION_AND_TOKEN_EXCHANGE",
        outcome: "SUCCESS",
        severity: "MEDIUM",
        actor: {
          actor_type: "human",
          actor_id: state.workforceUsers[0]?.principal_id || `principal_${slug(runId)}`,
          actor_label: state.workforceUsers[0]?.display_name || "Seed Workforce Employee 1",
        },
        target: { resource_type: "workforce_session", resource_id: state.workforceUsers[0]?.session_id || `wf_${slug(runId)}` },
        context: { session_id: state.workforceUsers[0]?.session_id || `wf_${slug(runId)}`, request_id: randomUUID() },
      },
    ];
    for (const event of events) {
      await postInternalAudit(DEFAULTS.controlplaneUrl, {
        event_id: randomUUID(),
        org_id: state.orgId,
        tenant_id: state.orgId,
        source_service: event.source_service,
        category: event.category,
        action: event.action,
        outcome: event.outcome,
        severity: event.severity,
        actor: event.actor,
        target: event.target,
        context: event.context,
        changes: [{ field: "status", before: "draft", after: "active", redacted: false }],
        attributes: { seeded: true, source: "node-sdk-seed" },
        tags: ["seed", event.category, event.source_service],
        occurred_at: nowIso(),
        ingested_at: nowIso(),
        retention_class: "HOT_90D",
      }, event.source_service);
    }

    await client.controlplane.createAuditSavedView(state.orgId, {
      name: "High-risk runtime actions",
      is_default: true,
      query: {
        category: "runtime",
        outcome: "ESCALATE",
        source_service: "kernel",
        limit: 100,
      },
    });
    await client.controlplane.createAuditNotableRule(state.orgId, {
      name: "Escalations in runtime",
      enabled: true,
      definition: {
        category: "runtime",
        outcome: "ESCALATE",
        severity: ["HIGH", "CRITICAL"],
      },
    });

    const dashboard = await client.controlplane.createDashboard(state.orgId, {
      name: "SOC Runtime Command Center",
      description: "Cross-service security posture board.",
      tags: ["security", "runtime", "seed", "node-sdk"],
      layout_type: "free",
      reflow_type: "auto",
      definition: {
        widgets: [
          {
            widget_id: "w1",
            type: "query_value",
            title: "Kernel traces",
            layout: { i: "w1", x: 0, y: 0, w: 4, h: 4 },
            queries: [{ query_id: "q1", source_service: "kernel", dataset: "traces", measure: "count", aggregation: "count" }],
          },
          {
            widget_id: "w2",
            type: "query_value",
            title: "Policy violations",
            layout: { i: "w2", x: 4, y: 0, w: 4, h: 4 },
            queries: [{ query_id: "q2", source_service: "arbiter", dataset: "policy.violations", measure: "count", aggregation: "count" }],
          },
          {
            widget_id: "w3",
            type: "query_value",
            title: "Audit volume",
            layout: { i: "w3", x: 8, y: 0, w: 4, h: 4 },
            queries: [{ query_id: "q3", source_service: "controlplane", dataset: "audit.events", measure: "count", aggregation: "count" }],
          },
        ],
        template_variables: [
          { name: "service", label: "Service", default: "all", options: ["all", "kernel", "arbiter", "chronos", "controlplane"] },
        ],
      },
    });
    const dashboardId = pick(dashboard, [["dashboard", "dashboard_id"], ["dashboard", "id"]], "");
    if (dashboardId) {
      state.dashboardIds.push(dashboardId);
      await client.controlplane.createDashboardSavedView(state.orgId, dashboardId, {
        name: "Security default",
        time_window: "last_24h",
        variables: { service: "all" },
      });
      await client.controlplane.putDashboardPermissions(state.orgId, dashboardId, {
        permissions: [
          { role_slug: "org_admin", can_view: true, can_edit: true },
          { role_slug: "soc_analyst", can_view: true, can_edit: true },
          { role_slug: "auditor", can_view: true, can_edit: false },
          { role_slug: "read_only", can_view: true, can_edit: false },
        ],
      });
      await client.controlplane.cloneDashboard(state.orgId, dashboardId, { name: "SOC Runtime Command Center Clone" });
      await client.controlplane.exportDashboard(state.orgId, dashboardId);
      await client.controlplane.listDashboardVersions(state.orgId, dashboardId);
    }
  }, { required: false });

  const traceSearch = await step("collect counts", async () => {
    const client = admin();
    const traces = await client.kernel.traceSearch({ limit: 250 });
    const alerts = await client.alerts.list({ limit: 200 });
    const anomalies = await client.alerts.listAnomalies({ limit: 200 });
    const incidents = await client.incidents.list({ limit: 200 });
    const autonomy = await client.kernel.listAutonomySessions({ limit: 50 });
    const workforceSubjects = await client.controlplane.listWorkforceSubjects(state.orgId, 200);
    const workforceSessions = await client.controlplane.listWorkforceSessions(state.orgId, 200);
    const workforceAudit = await client.controlplane.listWorkforceAudit(state.orgId, 200);
    await client.controlplane.listAuditEvents(state.orgId, { limit: 100 });
    await client.controlplane.listAuditNotableEvents(state.orgId, 100);
    await client.controlplane.listDashboards(state.orgId);

    return {
      traces,
      alerts,
      anomalies,
      incidents,
      autonomy,
      workforceSubjects,
      workforceSessions,
      workforceAudit,
    };
  });

  const traceItems = getFirstArray(traceSearch?.traces || traceSearch, "items").length
    ? getFirstArray(traceSearch?.traces || traceSearch, "items")
    : getFirstArray(traceSearch?.traces || traceSearch, "traces");

  const summary = {
    traces: Array.isArray(traceItems) ? traceItems.length : 0,
    decisions: toDecisionMix(Array.isArray(traceItems) ? traceItems : []),
    alerts: toCountArray(traceSearch?.alerts, ["alerts"]),
    anomalies: toCountArray(traceSearch?.anomalies, ["anomalies"]),
    incidents: toCountArray(traceSearch?.incidents, ["incidents"]),
    autonomy_sessions: toCountArray(traceSearch?.autonomy, ["sessions"]),
    workforce_subjects: toCountArray(traceSearch?.workforceSubjects, ["subjects"]),
    workforce_sessions: toCountArray(traceSearch?.workforceSessions, ["sessions"]),
    workforce_audit: toCountArray(traceSearch?.workforceAudit, ["audit"]),
  };

  const artifacts = await writeArtifacts({
    outputDir: DEFAULTS.outputDir,
    appUrl: DEFAULTS.appUrl,
    orgId: state.orgId,
    adminEmail,
    adminPassword,
    browserTokens: state.browserTokens,
    services: {
      kernel_url: DEFAULTS.kernelUrl,
      arbiter_url: DEFAULTS.arbiterUrl,
      chronos_url: DEFAULTS.chronosUrl,
      controlplane_url: DEFAULTS.controlplaneUrl,
      meshgate_url: DEFAULTS.meshgateUrl,
    },
    summary,
    steps: stepResults,
  });

  log("Node SDK seed complete");
  process.stdout.write(`\nTenant: ${state.orgId}\n`);
  process.stdout.write(`Seed artifacts: ${DEFAULTS.outputDir}\n`);
  process.stdout.write(`Login helper: ${artifacts.loginHelperPath}\n`);
  process.stdout.write(`Summary JSON: ${artifacts.summaryPath}\n`);
  process.stdout.write(`Admin email: ${adminEmail}\n`);
  process.stdout.write(`Admin password: ${adminPassword}\n`);
  process.stdout.write(`Duration: ${Date.now() - startedAt}ms\n`);
  process.stdout.write(`Summary: ${JSON.stringify(summary)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
