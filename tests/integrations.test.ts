import { describe, expect, it, vi } from "vitest";

import {
  AnthropicMessagesAdapter,
  LLMGuard,
  LLMPolicyDeniedError,
  createOpenAIChatAdapter,
  makeGuardedTool,
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
      metadata: {
        agent_rationale: {
          goal: "Answer a customer support question.",
        },
      },
      invoke: async () => ({ id: "resp_123", model: "gpt-4.1-mini", usage: { total_tokens: 12 } }),
    });

    expect(result.trace.trace_id).toBe("trace_123");
    expect(kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "org_123",
        agent_id: "assistant-1",
        session_id: "sess-123",
        metadata: expect.objectContaining({
          agent_rationale: expect.objectContaining({
            schema_version: "agent-rationale.v1",
            capture_mode: "mixed",
            goal: "Answer a customer support question.",
            runtime: expect.objectContaining({
              provider: "openai",
              model: "gpt-4.1-mini",
              operation: "chat.completions",
            }),
          }),
        }),
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
        rationale: {
          goal: "Answer the support question.",
          hidden_reasoning: "do not capture this",
          messages: [{ role: "user", content: "raw" }],
        } as any,
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
    expect(kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          agent_rationale: expect.objectContaining({
            capture_mode: "mixed",
            goal: "Answer the support question.",
            safety: expect.objectContaining({
              hidden_reasoning_dropped: true,
              forbidden_fields: expect.arrayContaining([
                "$.metadata.agent_rationale.hidden_reasoning",
                "$.metadata.agent_rationale.messages",
              ]),
            }),
          }),
        }),
      }),
    );
    expect(anthropicCreate).toHaveBeenCalledWith({
      model: "claude-3-7-sonnet",
      messages: [{ role: "user", content: "hello" }],
      max_tokens: 256,
    });
  });

  it("wraps governed tool execution with allow and deny semantics", async () => {
    const kernel = {
      execute: vi.fn().mockResolvedValueOnce({ trace_id: "trace_tool_allow", decision: "ALLOW" })
        .mockResolvedValueOnce({ trace_id: "trace_tool_deny", decision: "DENY" }),
      getTrace: vi.fn()
        .mockResolvedValueOnce(trace("ALLOW"))
        .mockResolvedValueOnce(trace("DENY")),
      appendSessionEvent: vi.fn().mockResolvedValue({ ok: true }),
    } as any;

    const guard = new LLMGuard({
      kernel,
      agentId: "assistant-tools",
      sessionId: "sess-tools",
      tenantId: "org_123",
    });

    const execute = vi.fn(async (args: Record<string, unknown>) => ({
      ok: true,
      refundId: "re_123",
      args,
    }));

    const guardedRefund = makeGuardedTool({
      guard,
      toolName: "stripe.refund",
      execute,
      rationale: () => ({
        summary: "Issue a customer refund when policy allows it.",
        tool_args: { payment_intent: "raw" },
      } as any),
    });

    await expect(
      guardedRefund({
        payment_intent: "pi_123",
        amount: 1200,
      }),
    ).resolves.toMatchObject({
      trace_id: "trace_123",
      decision: "ALLOW",
      result: {
        ok: true,
        refundId: "re_123",
      },
    });

    await expect(
      guardedRefund({
        payment_intent: "pi_999",
        amount: 2400,
      }),
    ).resolves.toMatchObject({
      trace_id: "trace_123",
      decision: "DENY",
      reason: "blocked",
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(kernel.appendSessionEvent).toHaveBeenCalledWith(
      "sess-tools",
      expect.objectContaining({
        type: "llm.response",
        payload: expect.objectContaining({
          provider: "tool-runtime",
          operation: "stripe.refund",
        }),
      }),
    );
    expect(kernel.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          agent_rationale: expect.objectContaining({
            runtime: expect.objectContaining({ tool: "tool.stripe.refund" }),
            safety: expect.objectContaining({
              forbidden_fields: expect.arrayContaining(["$.metadata.agent_rationale.tool_args"]),
            }),
          }),
        }),
      }),
    );
  });
});
