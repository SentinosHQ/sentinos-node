import type { DecisionTrace } from "../types.js";
import { LLMGuard, type AgentRationaleInput } from "./llm.js";

function decisionText(trace: DecisionTrace): string {
  return String(trace.policy_evaluation?.decision || "").trim().toUpperCase();
}

export type GuardedToolResult<TResult> = {
  trace_id: string;
  decision: string;
  reason?: string;
  result?: TResult;
};

export function makeGuardedTool<
  TArgs extends Record<string, unknown>,
  TResult,
>(opts: {
  guard: LLMGuard;
  toolName: string;
  execute: (args: TArgs) => Promise<TResult> | TResult;
  provider?: string;
  metadata?: Record<string, unknown> | ((args: TArgs) => Record<string, unknown>);
  rationale?: AgentRationaleInput | ((args: TArgs) => AgentRationaleInput);
}) {
  const provider = opts.provider ?? "tool-runtime";

  return async (args: TArgs): Promise<GuardedToolResult<TResult>> => {
    const metadata =
      typeof opts.metadata === "function" ? opts.metadata(args) : opts.metadata;
    const rationale =
      typeof opts.rationale === "function" ? opts.rationale(args) : opts.rationale;
    const trace = await opts.guard.authorize({
      provider,
      operation: opts.toolName,
      request: {
        tool: opts.toolName,
        args,
      },
      metadata,
      rationale,
      toolName: `tool.${opts.toolName}`,
    });

    const decision = decisionText(trace);
    if (decision !== "ALLOW" && decision !== "SHADOW") {
      return {
        trace_id: trace.trace_id,
        decision,
        reason: trace.policy_evaluation?.reason,
      };
    }

    const result = await opts.execute(args);
    try {
      await opts.guard.recordResponse({
        provider,
        operation: opts.toolName,
        trace,
        response: result,
      });
    } catch {
      // Best-effort event capture; the decision trace is already persisted.
    }

    return {
      trace_id: trace.trace_id,
      decision,
      result,
    };
  };
}
