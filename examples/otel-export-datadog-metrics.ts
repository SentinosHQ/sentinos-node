import { pathToFileURL } from "node:url";

import {
  buildDatadogMetricsOtelExportConfig,
  SentinosClient,
} from "@sentinos/node";

type OtelKernelClient = {
  updateOtelExportConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  testOtelExport(): Promise<Record<string, unknown>>;
  getOtelExportStatus(): Promise<Record<string, unknown>>;
};

type DatadogMetricsExamplePayload = {
  endpoint?: string;
  headerKeys: string[];
  tracesEnabled: boolean;
  metricsEnabled: boolean;
  testOk?: boolean;
  tracesDelivered?: boolean;
  metricsDelivered?: boolean;
  tracesExported?: number;
  metricsExported?: number;
  nextStep: string;
};

export async function runDatadogMetricsOtelExportExample(opts: {
  client?: { kernel: OtelKernelClient };
  endpoint?: string;
  apiKey?: string;
  metricConfigHeader?: string;
  serviceName?: string;
  environment?: string;
  output?: (payload: DatadogMetricsExamplePayload) => void;
} = {}): Promise<DatadogMetricsExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const config = buildDatadogMetricsOtelExportConfig({
    endpoint:
      opts.endpoint ||
      process.env.SENTINOS_OTEL_DATADOG_ENDPOINT ||
      "https://otlp.datadoghq.com/v1/metrics",
    apiKey: opts.apiKey || process.env.DD_API_KEY || "",
    metricConfigHeader:
      opts.metricConfigHeader || process.env.SENTINOS_DATADOG_METRIC_CONFIG,
    serviceName:
      opts.serviceName || process.env.SENTINOS_SERVICE_NAME || "sentinos-sdk-example",
    environment: opts.environment || process.env.SENTINOS_ENVIRONMENT || "dev",
  });

  const saved = await client.kernel.updateOtelExportConfig(config);
  const tested = await client.kernel.testOtelExport();
  const status = await client.kernel.getOtelExportStatus();

  const payload = {
    endpoint: String(saved.endpoint || config.endpoint || ""),
    headerKeys: Object.keys(config.header_values_write_only || {}),
    tracesEnabled: Boolean(config.traces_enabled),
    metricsEnabled: Boolean(config.metrics_enabled),
    testOk: Boolean(tested.ok),
    tracesDelivered: Boolean(tested.trace_delivered),
    metricsDelivered: Boolean(tested.metrics_delivered),
    tracesExported: Number(status.traces_exported || 0),
    metricsExported: Number(status.metrics_exported || 0),
    nextStep:
      "Open Settings to confirm the metrics-only Datadog delivery state, then keep trace investigation in Sentinos unless your Datadog organization has direct OTLP traces intake enabled.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDatadogMetricsOtelExportExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
