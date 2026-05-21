import { pathToFileURL } from "node:url";

import { SentinosClient } from "@sentinos/node";

type OtelKernelClient = {
  updateOtelExportConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  testOtelExport(): Promise<Record<string, unknown>>;
  getOtelExportStatus(): Promise<Record<string, unknown>>;
};

type OtelExamplePayload = {
  enabled?: boolean;
  endpoint?: string;
  testOk?: boolean;
  queueDepth?: number;
  tracesExported?: number;
  metricsExported?: number;
  nextStep: string;
};

export async function runOtelExportBridgeExample(opts: {
  client?: { kernel: OtelKernelClient };
  output?: (payload: OtelExamplePayload) => void;
} = {}): Promise<OtelExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const endpoint =
    process.env.SENTINOS_OTEL_ENDPOINT || "https://otel.acme.example/v1/traces";

  const config = await client.kernel.updateOtelExportConfig({
    enabled: true,
    endpoint,
    protocol: "http/protobuf",
    traces_enabled: true,
    metrics_enabled: true,
    include_sentinos_extensions: true,
    include_internal_service_spans: false,
    resource_attributes: {
      "service.name": "sentinos-sdk-example",
      "deployment.environment": process.env.SENTINOS_ENVIRONMENT || "dev",
    },
    header_values_write_only: process.env.SENTINOS_OTEL_AUTH_HEADER
      ? { authorization: process.env.SENTINOS_OTEL_AUTH_HEADER }
      : {},
    privacy_mode: "policy_enforced",
  });
  const tested = await client.kernel.testOtelExport();
  const status = await client.kernel.getOtelExportStatus();

  const payload = {
    enabled: Boolean(config.enabled),
    endpoint: String(config.endpoint || endpoint),
    testOk: Boolean(tested.ok),
    queueDepth: Number(status.queue_depth || 0),
    tracesExported: Number(status.traces_exported || 0),
    metricsExported: Number(status.metrics_exported || 0),
    nextStep:
      "Open Settings to confirm bridge status, then inspect a trace in Traces and use the external trace link if your deep link template is configured.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOtelExportBridgeExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
