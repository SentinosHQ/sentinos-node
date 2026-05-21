import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type SlackKernelClient = {
  validateNotificationChannel(
    body: Record<string, unknown>,
  ): Promise<{ ok?: boolean }>;
  createNotificationChannel(
    body: Record<string, unknown>,
  ): Promise<{ channel_id?: string }>;
  testNotificationChannel(
    channelId: string,
    message?: string,
  ): Promise<{ success?: boolean }>;
  listEscalations(params?: Record<string, unknown>): Promise<{
    escalations?: Array<Record<string, unknown>>;
  }>;
};

type SlackOperatorPayload = {
  validationOk: boolean;
  channelId?: string;
  testSuccess?: boolean;
  pendingEscalations: number;
  pendingTraceId?: string;
  nextStep: string;
};

function parseTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export async function runSlackOperatorWorkflowExample(opts: {
  client?: { kernel: SlackKernelClient };
  webhookUrl?: string;
  channelId?: string;
  channelName?: string;
  createChannel?: boolean;
  output?: (payload: SlackOperatorPayload) => void;
} = {}): Promise<SlackOperatorPayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const webhookUrl = opts.webhookUrl || process.env.SLACK_WEBHOOK_URL || "";
  const channelName =
    opts.channelName || process.env.SENTINOS_SLACK_CHANNEL_NAME || "Sentinos Slack Ops";
  let channelId = opts.channelId || process.env.SENTINOS_SLACK_CHANNEL_ID || "";
  const createChannel =
    typeof opts.createChannel === "boolean"
      ? opts.createChannel
      : parseTruthy(process.env.SENTINOS_CREATE_SLACK_CHANNEL || "");

  if (!webhookUrl.trim() && !channelId.trim()) {
    throw new Error(
      "Set SLACK_WEBHOOK_URL to validate or create a Slack channel, or set SENTINOS_SLACK_CHANNEL_ID to test an existing channel.",
    );
  }

  let validationOk = false;
  if (webhookUrl.trim()) {
    const preview = await client.kernel.validateNotificationChannel({
      kind: "SLACK",
      config: { webhook_url: webhookUrl.trim() },
    });
    validationOk = Boolean(preview.ok);
  }

  if (!channelId && createChannel) {
    const created = await client.kernel.createNotificationChannel({
      kind: "SLACK",
      name: channelName,
      enabled: true,
      config: { webhook_url: webhookUrl.trim() },
    });
    channelId = String(created.channel_id || "");
  }

  let testSuccess: boolean | undefined;
  if (channelId) {
    const tested = await client.kernel.testNotificationChannel(channelId);
    testSuccess = Boolean(tested.success);
  }

  const escalationList = await client.kernel.listEscalations({
    status: "PENDING",
    limit: 5,
  });
  const pendingEscalations = Array.isArray(escalationList.escalations)
    ? escalationList.escalations
    : [];

  const payload = {
    validationOk,
    channelId: channelId || undefined,
    testSuccess,
    pendingEscalations: pendingEscalations.length,
    pendingTraceId:
      pendingEscalations.length > 0
        ? String(pendingEscalations[0]?.trace_id || "")
        : undefined,
    nextStep:
      "Open Alerts to verify the Slack channel, then move into Kernel and Traces for the governed approval or investigation flow.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSlackOperatorWorkflowExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
