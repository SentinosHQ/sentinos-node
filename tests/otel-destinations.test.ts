import { describe, expect, it } from "vitest";

import {
  buildDatadogMetricsOtelExportConfig,
  buildHoneycombOtelExportConfig,
  HONEYCOMB_OTLP_ENDPOINTS,
} from "../src/integrations/otel-destinations";

describe("OTLP destination helpers", () => {
  it("builds a Honeycomb config for the default region", () => {
    const config = buildHoneycombOtelExportConfig({
      apiKey: "hca_test",
      serviceName: "support-runtime",
      environment: "prod",
    });

    expect(config).toEqual({
      enabled: true,
      endpoint: HONEYCOMB_OTLP_ENDPOINTS.us,
      protocol: "http/protobuf",
      traces_enabled: true,
      metrics_enabled: true,
      include_sentinos_extensions: true,
      include_internal_service_spans: false,
      resource_attributes: {
        "service.name": "support-runtime",
        "deployment.environment": "prod",
      },
      header_values_write_only: {
        "x-honeycomb-team": "hca_test",
      },
      privacy_mode: "policy_enforced",
    });
  });

  it("adds the classic dataset header when supplied", () => {
    const config = buildHoneycombOtelExportConfig({
      apiKey: "hca_test",
      dataset: "support-prod",
      region: "eu",
      resourceAttributes: {
        "service.namespace": "acme",
      },
    });

    expect(config.endpoint).toBe(HONEYCOMB_OTLP_ENDPOINTS.eu);
    expect(config.header_values_write_only).toEqual({
      "x-honeycomb-team": "hca_test",
      "x-honeycomb-dataset": "support-prod",
    });
    expect(config.resource_attributes).toEqual({
      "service.namespace": "acme",
    });
  });

  it("rejects a blank Honeycomb API key", () => {
    expect(() =>
      buildHoneycombOtelExportConfig({
        apiKey: "   ",
      }),
    ).toThrow("Honeycomb API key is required");
  });

  it("rejects an unsupported Honeycomb region", () => {
    expect(() =>
      buildHoneycombOtelExportConfig({
        apiKey: "hca_test",
        region: "apac",
      }),
    ).toThrow('Unsupported Honeycomb region "apac". Use "us" or "eu".');
  });

  it("builds a Datadog metrics-only config", () => {
    const config = buildDatadogMetricsOtelExportConfig({
      endpoint: "https://otlp.datadoghq.com/v1/metrics",
      apiKey: "dd_test",
      metricConfigHeader: '{"resource_attributes_as_tags":true}',
      serviceName: "support-runtime",
      environment: "prod",
    });

    expect(config).toEqual({
      enabled: true,
      endpoint: "https://otlp.datadoghq.com/v1/metrics",
      protocol: "http/protobuf",
      traces_enabled: false,
      metrics_enabled: true,
      include_sentinos_extensions: true,
      include_internal_service_spans: false,
      resource_attributes: {
        "service.name": "support-runtime",
        "deployment.environment": "prod",
      },
      header_values_write_only: {
        "dd-api-key": "dd_test",
        "dd-otel-metric-config": '{"resource_attributes_as_tags":true}',
      },
      privacy_mode: "policy_enforced",
    });
  });

  it("rejects a blank Datadog endpoint", () => {
    expect(() =>
      buildDatadogMetricsOtelExportConfig({
        endpoint: "   ",
        apiKey: "dd_test",
      }),
    ).toThrow("Datadog OTLP metrics endpoint is required");
  });

  it("rejects metrics being disabled for the Datadog metrics helper", () => {
    expect(() =>
      buildDatadogMetricsOtelExportConfig({
        endpoint: "https://otlp.datadoghq.com/v1/metrics",
        apiKey: "dd_test",
        metricsEnabled: false,
      }),
    ).toThrow("Datadog metrics helper requires metricsEnabled to remain true");
  });
});
