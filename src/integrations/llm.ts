import type { DecisionTrace, KernelExecuteResponse } from "../types.js";
import type { KernelClient } from "../clients/kernel.js";

export class LLMPolicyExecutionError<T = unknown> extends Error {
  readonly trace: DecisionTrace;

  constructor(message: string, trace: DecisionTrace) {
    super(message);
    this.trace = trace;
  }
}

export class LLMPolicyDeniedError<T = unknown> extends LLMPolicyExecutionError<T> {}

export class LLMPolicyEscalationError<T = unknown> extends LLMPolicyExecutionError<T> {}

export type LLMPolicyResult<T> = {
  provider: string;
  operation: string;
  trace: DecisionTrace;
  response: T;
};

function toolName(provider: string, operation: string): string {
  const p = provider.trim().toLowerCase();
  const op = operation.trim().toLowerCase();
  if (!p) throw new Error("provider is required");
  if (!op) throw new Error("operation is required");
  return `llm.${p}.${op}`;
}

function decisionText(trace: DecisionTrace | KernelExecuteResponse): string {
  if ("policy_evaluation" in trace) {
    return String(trace.policy_evaluation?.decision || "").trim().toUpperCase();
  }
  return String(trace.decision || "").trim().toUpperCase();
}

function summarizeResponse(response: unknown): Record<string, unknown> {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const source = response as Record<string, unknown>;
    const summary: Record<string, unknown> = {};
    for (const key of ["id", "model", "created", "usage", "stop_reason", "type", "status"]) {
      if (key in source) summary[key] = source[key];
    }
    if (Object.keys(summary).length) return summary;
  }
  return { response_type: Array.isArray(response) ? "array" : typeof response };
}

export type LLMGuardOptions = {
  kernel: KernelClient;
  agentId: string;
  sessionId: string;
  tenantId?: string;
};

export type LLMGuardAuthorizeOptions = {
  provider: string;
  operation: string;
  request: Record<string, unknown>;
  model?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
  orgId?: string;
  toolName?: string;
};

export type LLMGuardRunOptions<T> = LLMGuardAuthorizeOptions & {
  invoke: () => Promise<T> | T;
  responseSummarizer?: (response: T) => Record<string, unknown>;
};

export class LLMGuard {
  readonly kernel: KernelClient;
  readonly agentId: string;
  readonly sessionId: string;
  readonly tenantId?: string;

  constructor(opts: LLMGuardOptions) {
    this.kernel = opts.kernel;
    this.agentId = opts.agentId;
    this.sessionId = opts.sessionId;
    this.tenantId = opts.tenantId;
  }

  async authorize(opts: LLMGuardAuthorizeOptions): Promise<DecisionTrace> {
    const args: Record<string, unknown> = {
      provider: opts.provider,
      operation: opts.operation,
      request: opts.request,
    };
    if (opts.model !== undefined) args.model = opts.model;

    const metadata: Record<string, unknown> = {
      skip_connector: true,
      integration_kind: "llm",
      provider: opts.provider,
      operation: opts.operation,
      ...(opts.metadata || {}),
    };

    const executeResponse = await this.kernel.execute({
      tenant_id: opts.tenantId ?? opts.orgId ?? this.tenantId,
      agent_id: this.agentId,
      session_id: this.sessionId,
      intent: {
        type: "llm_call",
        tool: opts.toolName || toolName(opts.provider, opts.operation),
        args,
      },
      metadata,
    });
    return this.kernel.getTrace(executeResponse.trace_id);
  }

  async run<T>(opts: LLMGuardRunOptions<T>): Promise<LLMPolicyResult<T>> {
    const trace = await this.authorize(opts);
    const decision = decisionText(trace);
    if (decision === "DENY") {
      throw new LLMPolicyDeniedError(
        `Sentinos denied ${opts.provider}.${opts.operation}: ${trace.policy_evaluation?.reason || "policy denied"}`,
        trace
      );
    }
    if (decision === "ESCALATE") {
      throw new LLMPolicyEscalationError(
        `Sentinos escalated ${opts.provider}.${opts.operation}: ${trace.policy_evaluation?.reason || "approval required"}`,
        trace
      );
    }

    const response = await opts.invoke();
    try {
      await this.recordResponse({
        provider: opts.provider,
        operation: opts.operation,
        trace,
        response,
        tenantId: opts.tenantId ?? opts.orgId ?? this.tenantId,
        responseSummarizer: opts.responseSummarizer,
      });
    } catch {
      // Best-effort event capture; the decision trace is already persisted.
    }

    return {
      provider: opts.provider,
      operation: opts.operation,
      trace,
      response,
    };
  }

  async recordResponse<T>(opts: {
    provider: string;
    operation: string;
    trace: DecisionTrace;
    response: T;
    tenantId?: string;
    orgId?: string;
    responseSummarizer?: (response: T) => Record<string, unknown>;
  }): Promise<void> {
    await this.kernel.appendSessionEvent(this.sessionId, {
      type: "llm.response",
      payload: {
        provider: opts.provider,
        operation: opts.operation,
        decision: decisionText(opts.trace),
        trace_id: opts.trace.trace_id,
        summary: (opts.responseSummarizer || summarizeResponse)(opts.response),
      },
      tenantId: opts.tenantId,
      orgId: opts.orgId,
    });
  }
}
