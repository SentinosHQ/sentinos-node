import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type DatadogKernelClient = {
  exportDatadog(body: Record<string, unknown>): Promise<Record<string, unknown>>;
};

type DatadogExamplePayload = {
  site?: string;
  apiBaseUrl?: string;
  metricPrefix: string;
  alertsExported: number;
  incidentsExported: number;
  eventsStatus: string;
  nextStep: string;
};

function parseTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export async function runDatadogExportExample(opts: {
  client?: { kernel: DatadogKernelClient };
  apiKey?: string;
  appKey?: string;
  site?: string;
  apiBaseUrl?: string;
  metricPrefix?: string;
  includeEvents?: boolean;
  limit?: number;
  output?: (payload: DatadogExamplePayload) => void;
} = {}): Promise<DatadogExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const apiKey = opts.apiKey || process.env.DATADOG_API_KEY || "";
  const site = opts.site || process.env.DATADOG_SITE || "datadoghq.com";
  const apiBaseUrl = opts.apiBaseUrl || process.env.DATADOG_API_BASE_URL || "";
  if (!apiKey.trim()) {
    throw new Error("Set DATADOG_API_KEY to a Datadog API key.");
  }
  if (!site.trim() && !apiBaseUrl.trim()) {
    throw new Error("Set DATADOG_SITE or DATADOG_API_BASE_URL before running the Datadog export example.");
  }

  const result = await client.kernel.exportDatadog({
    api_key: apiKey,
    app_key: opts.appKey || process.env.DATADOG_APP_KEY || undefined,
    site: site.trim() || undefined,
    api_base_url: apiBaseUrl.trim() || undefined,
    metric_prefix:
      opts.metricPrefix || process.env.DATADOG_METRIC_PREFIX || "sentinos",
    include_events:
      typeof opts.includeEvents === "boolean"
        ? opts.includeEvents
        : parseTruthy(process.env.DATADOG_INCLUDE_EVENTS ?? "1"),
    limit: opts.limit ?? Number(process.env.DATADOG_EXPORT_LIMIT || 250),
  });

  const payload = {
    site: String(result.site || site || ""),
    apiBaseUrl: String(result.api_base_url || apiBaseUrl || ""),
    metricPrefix: String(result.metric_prefix || "sentinos"),
    alertsExported: Number(result.alerts_exported || 0),
    incidentsExported: Number(result.incidents_exported || 0),
    eventsStatus: String(result.events_status || "unknown"),
    nextStep:
      "Open Alerts, Incidents, or Traces in Sentinos to correlate the exported Datadog rollups with the runtime evidence that produced them.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDatadogExportExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
