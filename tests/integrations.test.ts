import { describe, expect, it, vi } from "vitest";

import {
  AnthropicMessagesAdapter,
  LLMGuard,
  LLMPolicyDeniedError,
  createOpenAIChatAdapter,
  type DecisionTrace,
} from "../src";

function trace(decision: "ALLOW" | "DENY" | "ESCALATE" | "SHADOW"): DecisionTrace {
  return {
    schema_version: "decision-trace.v1",
    trace_id: "trace_123",
    timestamp: "2026-03-09T12:00:00Z",
    tenant_id: "org_123",
    intent: { type: "llm_call", tool: "llm.openai.chat.completions" },
    policy_evaluation: {
      policy_id: "policy.runtime",
      decision,
      reason: decision === "DENY" ? "blocked" : "allowed",
    },
  };
}

describe("Node LLM integrations", () => {
  it("normalizes Kernel execute responses into full traces and records response summaries", async () => {
    const kernel = {
      execute: vi.fn().mockResolvedValue({ trace_id: "trace_123", decision: "ALLOW" }),
      getTrace: vi.fn().mockResolvedValue(trace("ALLOW")),
      appendSessionEvent: vi.fn().mockResolvedValue({ ok: true }),
    } as any;

    const guard = new LLMGuard({
      kernel,
      agentId: "assistant-1",
      sessionId: "sess-123",
      tenantId: "org_123",
    });

    const result = await guard.run({
      provider: "openai",
      operation: "chat.completions",
      model: "gpt-4.1-mini",
      request: { model: "gpt-4.1-mini", messages: [{ role: "user", content: "hello" }] },
      invoke: async () => ({ id: "resp_123", model: "gpt-4.1-mini", usage: { total_tokens: 12 } }),
    });

    expect(result.trace.trace_id).toBe("trace_123");
    expect(kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "org_123",
        agent_id: "assistant-1",
        session_id: "sess-123",
      }),
    );
    expect(kernel.getTrace).toHaveBeenCalledWith("trace_123");
    expect(kernel.appendSessionEvent).toHaveBeenCalledWith(
      "sess-123",
      expect.objectContaining({
        type: "llm.response",
        payload: expect.objectContaining({
          trace_id: "trace_123",
          decision: "ALLOW",
          provider: "openai",
          operation: "chat.completions",
        }),
      }),
    );
  });

  it("raises policy errors before provider invocation", async () => {
    const kernel = {
      execute: vi.fn().mockResolvedValue({ trace_id: "trace_456", decision: "DENY" }),
      getTrace: vi.fn().mockResolvedValue(trace("DENY")),
      appendSessionEvent: vi.fn(),
    } as any;

    const guard = new LLMGuard({
      kernel,
      agentId: "assistant-1",
      sessionId: "sess-123",
      tenantId: "org_123",
    });
    const invoke = vi.fn();

    await expect(
      guard.run({
        provider: "anthropic",
        operation: "messages.create",
        request: { model: "claude-sonnet", messages: [{ role: "user", content: "hello" }] },
        invoke,
      }),
    ).rejects.toBeInstanceOf(LLMPolicyDeniedError);

    expect(invoke).not.toHaveBeenCalled();
    expect(kernel.appendSessionEvent).not.toHaveBeenCalled();
  });

  it("wraps OpenAI and Anthropic clients with the same guard semantics", async () => {
    const kernel = {
      execute: vi.fn().mockResolvedValue({ trace_id: "trace_789", decision: "ALLOW" }),
      getTrace: vi.fn().mockResolvedValue(trace("ALLOW")),
      appendSessionEvent: vi.fn().mockResolvedValue({ ok: true }),
    } as any;
    const guard = new LLMGuard({
      kernel,
      agentId: "assistant-2",
      sessionId: "sess-456",
      tenantId: "org_123",
    });

    const openaiCreate = vi.fn().mockResolvedValue({ id: "chat_1" });
    const anthropicCreate = vi.fn().mockResolvedValue({ id: "msg_1" });

    const openai = createOpenAIChatAdapter({
      guard,
      client: { chat: { completions: { create: openaiCreate } } },
    });
    const anthropic = new AnthropicMessagesAdapter({
      guard,
      createFn: anthropicCreate,
    });

    await expect(
      openai.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "hello" }],
        temperature: 0.2,
      }),
    ).resolves.toMatchObject({
      provider: "openai",
      operation: "chat.completions",
      response: { id: "chat_1" },
    });

    await expect(
      anthropic.create({
        model: "claude-3-7-sonnet",
        messages: [{ role: "user", content: "hello" }],
        max_tokens: 256,
      }),
    ).resolves.toMatchObject({
      provider: "anthropic",
      operation: "messages.create",
      response: { id: "msg_1" },
    });

    expect(openaiCreate).toHaveBeenCalledWith({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "hello" }],
      temperature: 0.2,
    });
    expect(anthropicCreate).toHaveBeenCalledWith({
      model: "claude-3-7-sonnet",
      messages: [{ role: "user", content: "hello" }],
      max_tokens: 256,
    });
  });
});
