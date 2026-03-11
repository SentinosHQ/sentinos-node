import { describe, expect, it, vi } from "vitest";

import {
  WorkforceMappingError,
  WorkforcePolicyDeniedError,
  WorkforceSessionRevokedError,
  WorkforceTokenProvider,
} from "../src";

function tokenPayload(suffix: string, minutes = 10) {
  return {
    access_token: `access-${suffix}`,
    refresh_token: `refresh-${suffix}`,
    expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
  };
}

describe("WorkforceTokenProvider", () => {
  it("exchanges once, caches tokens, and refreshes when stale", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tokens: tokenPayload("exchange") }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(tokenPayload("refresh")), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ) as unknown as typeof fetch;

    const provider = new WorkforceTokenProvider({
      controlplaneUrl: "https://app.sentinoshq.test",
      orgId: "org_123",
      idpIssuer: "okta",
      assertionProvider: async () => ({
        externalSubject: "user-123",
        email: "sdk@example.com",
        groups: ["engineering"],
      }),
      refreshSkewSeconds: 0,
      fetchImpl,
    });

    await expect(provider.headers()).resolves.toEqual({
      authorization: "Bearer access-exchange",
    });
    await expect(provider.headers()).resolves.toEqual({
      authorization: "Bearer access-exchange",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    (provider as any).expiresAt = new Date(Date.now() - 1_000);

    await expect(provider.headers()).resolves.toEqual({
      authorization: "Bearer access-refresh",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://app.sentinoshq.test/v1/workforce/token/exchange",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://app.sentinoshq.test/v1/workforce/token/refresh",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("maps policy, mapping, and revoked responses to specific error types", async () => {
    const policyFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "policy denied for requested audience" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const mappingFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "group mapping missing for external subject" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const revokedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "session revoked" }), {
        status: 410,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const assertionProvider = () => ({ externalSubject: "user-123" });

    const denied = new WorkforceTokenProvider({
      controlplaneUrl: "https://app.sentinoshq.test",
      orgId: "org_123",
      idpIssuer: "okta",
      assertionProvider,
      fetchImpl: policyFetch,
    });
    const mapping = new WorkforceTokenProvider({
      controlplaneUrl: "https://app.sentinoshq.test",
      orgId: "org_123",
      idpIssuer: "okta",
      assertionProvider,
      fetchImpl: mappingFetch,
    });
    const revoked = new WorkforceTokenProvider({
      controlplaneUrl: "https://app.sentinoshq.test",
      orgId: "org_123",
      idpIssuer: "okta",
      assertionProvider,
      fetchImpl: revokedFetch,
    });

    await expect(denied.headers()).rejects.toBeInstanceOf(WorkforcePolicyDeniedError);
    await expect(mapping.headers()).rejects.toBeInstanceOf(WorkforceMappingError);
    await expect(revoked.headers()).rejects.toBeInstanceOf(WorkforceSessionRevokedError);
  });
});
