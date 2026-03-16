export type TelemetryHelperOptions = {
  serviceName?: string;
  spanPrefix?: string;
  extraAttributes?: Record<string, string | number | boolean>;
  fetchImpl?: typeof fetch;
};

const importModule = Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<any>;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

export function withOpenTelemetryFetch(options: TelemetryHelperOptions = {}): typeof fetch {
  const baseFetch = options.fetchImpl ?? fetch;
  const serviceName = options.serviceName || "sentinos-sdk";
  const spanPrefix = options.spanPrefix || "sentinos.sdk";
  const extraAttributes = options.extraAttributes || {};

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let otel: any;
    try {
      otel = await importModule("@opentelemetry/api");
    } catch {
      return baseFetch(input, init);
    }

    const tracer = otel.trace.getTracer(serviceName);
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    const path = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    })();

    return tracer.startActiveSpan(`${spanPrefix} ${method} ${path}`, async (span: any) => {
      span.setAttribute("http.method", method);
      span.setAttribute("http.url", url);
      for (const [key, value] of Object.entries(extraAttributes)) {
        span.setAttribute(String(key), value as any);
      }
      try {
        const response = await baseFetch(input, init);
        span.setAttribute("http.status_code", response.status);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          span.recordException(error);
          span.setStatus({ code: otel.SpanStatusCode.ERROR, message: error.message });
        }
        throw error;
      } finally {
        span.end();
      }
    });
  };
}
