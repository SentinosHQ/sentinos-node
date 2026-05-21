import type { OtelExportConfig } from "../types.js";

export const HONEYCOMB_OTLP_ENDPOINTS = {
  us: "https://api.honeycomb.io:443",
  eu: "https://api.eu1.honeycomb.io:443",
} as const;

export type HoneycombRegion = keyof typeof HONEYCOMB_OTLP_ENDPOINTS;

export type HoneycombOtelExportOptions = {
  apiKey: string;
  dataset?: string;
  region?: HoneycombRegion | string;
  endpoint?: string;
  serviceName?: string;
  environment?: string;
  resourceAttributes?: Record<string, string>;
  deepLinkTemplate?: string;
  enabled?: boolean;
  tracesEnabled?: boolean;
  metricsEnabled?: boolean;
  includeSentinosExtensions?: boolean;
  includeInternalServiceSpans?: boolean;
};

export type DatadogMetricsOtelExportOptions = {
  endpoint: string;
  apiKey: string;
  metricConfigHeader?: string;
  serviceName?: string;
  environment?: string;
  resourceAttributes?: Record<string, string>;
  enabled?: boolean;
  metricsEnabled?: boolean;
  includeSentinosExtensions?: boolean;
  includeInternalServiceSpans?: boolean;
};

function normalizeHoneycombRegion(region?: HoneycombRegion | string): HoneycombRegion {
  const normalized = (region || "us").trim().toLowerCase();
  if (normalized === "us" || normalized === "eu") {
    return normalized;
  }
  throw new Error(`Unsupported Honeycomb region "${region}". Use "us" or "eu".`);
}

export function buildHoneycombOtelExportConfig(
  options: HoneycombOtelExportOptions,
): OtelExportConfig {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error("Honeycomb API key is required");
  }

  const region = normalizeHoneycombRegion(options.region);
  const endpoint = options.endpoint?.trim() || HONEYCOMB_OTLP_ENDPOINTS[region];
  const resourceAttributes = { ...(options.resourceAttributes || {}) };

  if (options.serviceName?.trim()) {
    resourceAttributes["service.name"] = options.serviceName.trim();
  }
  if (options.environment?.trim()) {
    resourceAttributes["deployment.environment"] = options.environment.trim();
  }

  const headers: Record<string, string> = {
    "x-honeycomb-team": apiKey,
  };
  if (options.dataset?.trim()) {
    headers["x-honeycomb-dataset"] = options.dataset.trim();
  }

  const config: OtelExportConfig = {
    enabled: options.enabled ?? true,
    endpoint,
    protocol: "http/protobuf",
    traces_enabled: options.tracesEnabled ?? true,
    metrics_enabled: options.metricsEnabled ?? true,
    include_sentinos_extensions: options.includeSentinosExtensions ?? true,
    include_internal_service_spans: options.includeInternalServiceSpans ?? false,
    resource_attributes: resourceAttributes,
    header_values_write_only: headers,
    privacy_mode: "policy_enforced",
  };

  if (options.deepLinkTemplate?.trim()) {
    config.deep_link_template = options.deepLinkTemplate.trim();
  }

  return config;
}

export function buildDatadogMetricsOtelExportConfig(
  options: DatadogMetricsOtelExportOptions,
): OtelExportConfig {
  const endpoint = options.endpoint.trim();
  if (!endpoint) {
    throw new Error("Datadog OTLP metrics endpoint is required");
  }
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error("Datadog API key is required");
  }
  if (options.metricsEnabled === false) {
    throw new Error("Datadog metrics helper requires metricsEnabled to remain true");
  }

  const resourceAttributes = { ...(options.resourceAttributes || {}) };
  if (options.serviceName?.trim()) {
    resourceAttributes["service.name"] = options.serviceName.trim();
  }
  if (options.environment?.trim()) {
    resourceAttributes["deployment.environment"] = options.environment.trim();
  }

  const headers: Record<string, string> = {
    "dd-api-key": apiKey,
  };
  if (options.metricConfigHeader?.trim()) {
    headers["dd-otel-metric-config"] = options.metricConfigHeader.trim();
  }

  return {
    enabled: options.enabled ?? true,
    endpoint,
    protocol: "http/protobuf",
    traces_enabled: false,
    metrics_enabled: true,
    include_sentinos_extensions: options.includeSentinosExtensions ?? true,
    include_internal_service_spans: options.includeInternalServiceSpans ?? false,
    resource_attributes: resourceAttributes,
    header_values_write_only: headers,
    privacy_mode: "policy_enforced",
  };
}
