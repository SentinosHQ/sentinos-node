import { describe, expect, it } from "vitest";

import { SentinosClient } from "../src/client";

describe("SentinosClient (Node)", () => {
  it("fans out baseUrl to service URLs and preserves controlplane default for local runtime baseUrl", () => {
    const c = new SentinosClient({ baseUrl: "http://localhost:8081", orgId: "acme" });
    expect(c.config.kernelUrl).toBe("http://localhost:8081");
    expect(c.config.arbiterUrl).toBe("http://localhost:8081");
    expect(c.config.chronosUrl).toBe("http://localhost:8081");
    expect(c.config.controlplaneUrl).toBe("http://localhost:18084");
    expect(c.config.meshgateUrl).toBe("http://localhost:8085");
    expect(c.config.tenantId).toBe("acme");
  });

  it("uses controlplaneUrl derived from baseUrl for non-local hosts", () => {
    const c = new SentinosClient({ baseUrl: "https://api.sentinos.ai", tenantId: "acme" });
    expect(c.config.controlplaneUrl).toBe("https://api.sentinos.ai");
  });

  it("accepts orgId alias and rejects mismatch", () => {
    const c = new SentinosClient({ orgId: "org-1" });
    expect(c.config.tenantId).toBe("org-1");

    expect(() => new SentinosClient({ tenantId: "a", orgId: "b" })).toThrow(/must match/);
  });
});
