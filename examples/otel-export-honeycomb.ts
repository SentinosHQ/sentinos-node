import { pathToFileURL } from "node:url";

import {
  buildHoneycombOtelExportConfig,
  SentinosClient,
  type HoneycombRegion,
} from "@sentinos/node";

type OtelKernelClient = {
  updateOtelExportConfig(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  testOtelExport(): Promise<Record<string, unknown>>;
  getOtelExportStatus(): Promise<Record<string, unknown>>;
};

type HoneycombExamplePayload = {
  endpoint?: string;
  headerKeys: string[];
  testOk?: boolean;
  tracesExported?: number;
  metricsExported?: number;
  nextStep: string;
};

export async function runHoneycombOtelExportExample(opts: {
  client?: { kernel: OtelKernelClient };
  apiKey?: string;
  dataset?: string;
  region?: HoneycombRegion;
  serviceName?: string;
  environment?: string;
  output?: (payload: HoneycombExamplePayload) => void;
} = {}): Promise<HoneycombExamplePayload> {
  const client =
    opts.client ||
    SentinosClient.fromEnv({
      orgId: process.env.SENTINOS_ORG_ID,
    });

  const config = buildHoneycombOtelExportConfig({
    apiKey: opts.apiKey || process.env.HONEYCOMB_API_KEY || "",
    dataset: opts.dataset || process.env.HONEYCOMB_DATASET,
    region: opts.region || process.env.SENTINOS_OTEL_HONEYCOMB_REGION,
    serviceName: opts.serviceName || process.env.SENTINOS_SERVICE_NAME || "sentinos-sdk-example",
    environment: opts.environment || process.env.SENTINOS_ENVIRONMENT || "dev",
  });

  const saved = await client.kernel.updateOtelExportConfig(config);
  const tested = await client.kernel.testOtelExport();
  const status = await client.kernel.getOtelExportStatus();

  const payload = {
    endpoint: String(saved.endpoint || config.endpoint || ""),
    headerKeys: Object.keys(config.header_values_write_only || {}),
    testOk: Boolean(tested.ok),
    tracesExported: Number(status.traces_exported || 0),
    metricsExported: Number(status.metrics_exported || 0),
    nextStep:
      "Open Settings to confirm Honeycomb delivery state, then inspect a governed trace in Traces and open your external trace viewer if a deep link template is configured.",
  };
  (opts.output || console.log)(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHoneycombOtelExportExample({
    output: (payload) => {
      console.log(JSON.stringify(payload, null, 2));
    },
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
