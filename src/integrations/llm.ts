import type { DecisionTrace, KernelExecuteResponse } from "../types.js";
import type { KernelClient } from "../clients/kernel.js";

const FORBIDDEN_RATIONALE_KEYS = new Set([
  "chain_of_thought",
  "hidden_reasoning",
  "raw_prompt",
  "raw_prompts",
  "prompt",
  "prompts",
  "messages",
  "raw_messages",
  "tool_args",
  "raw_tool_args",
  "tool_output",
  "raw_tool_output",
  "tool_outputs",
  "raw_tool_outputs",
]);

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

export type AgentRationaleInput = {
  summary?: string;
  goal?: string;
  decision_basis?: string[];
  expected_outcome?: string;
  alternatives_considered?: string[];
  confidence?: number;
  workflow?: string;
  autonomy?: string;
  risk_context?: {
    data_class?: string;
    side_effects?: string[];
    external_domains?: string[];
    requires_approval?: boolean;
  };
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

function sanitizeRationale(input: AgentRationaleInput | undefined): {
  value: AgentRationaleInput;
  forbidden: string[];
  hiddenReasoningDropped: boolean;
} {
  if (!input) return { value: {}, forbidden: [], hiddenReasoningDropped: false };
  const value: Record<string, unknown> = {};
  const forbidden: string[] = [];
  let hiddenReasoningDropped = false;

  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_RATIONALE_KEYS.has(key)) {
      forbidden.push(`$.metadata.agent_rationale.${key}`);
      if (key === "chain_of_thought" || key === "hidden_reasoning") hiddenReasoningDropped = true;
      continue;
    }
    value[key] = raw;
  }

  return { value: value as AgentRationaleInput, forbidden, hiddenReasoningDropped };
}

function metadataRationale(metadata: Record<string, unknown> | undefined): AgentRationaleInput | undefined {
  const candidate = metadata?.agent_rationale;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
  return candidate as AgentRationaleInput;
}

function mergeRationaleInputs(
  metadata: Record<string, unknown> | undefined,
  rationale: AgentRationaleInput | undefined,
): AgentRationaleInput | undefined {
  const fromMetadata = metadataRationale(metadata);
  if (!fromMetadata) return rationale;
  return { ...fromMetadata, ...(rationale || {}) };
}

export function buildAgentRationale(opts: {
  provider: string;
  operation: string;
  model?: string;
  tool?: string;
  integration?: string;
  rationale?: AgentRationaleInput;
}): Record<string, unknown> {
  const sanitized = sanitizeRationale(opts.rationale);
  const rationale = sanitized.value;
  const hasStructured = Object.keys(rationale).some((key) => key !== "workflow" && key !== "autonomy");
  const sources = [{ kind: "sdk", field_paths: ["provider", "operation", "model", "toolName"] }];
  if (hasStructured) sources.push({ kind: "workflow", field_paths: ["metadata.agent_rationale"] });

  return {
    schema_version: "agent-rationale.v1",
    captured_at: new Date().toISOString(),
    capture_phase: "pre_execution",
    capture_mode: hasStructured ? "mixed" : "sdk_derived",
    sources,
    summary: rationale.summary ?? `Authorize ${opts.provider}.${opts.operation} before execution.`,
    goal: rationale.goal,
    decision_basis: rationale.decision_basis ?? [
      `Provider: ${opts.provider}`,
      `Operation: ${opts.operation}`,
      ...(opts.model ? [`Model: ${opts.model}`] : []),
      ...(opts.tool ? [`Tool: ${opts.tool}`] : []),
    ],
    expected_outcome: rationale.expected_outcome,
    alternatives_considered: rationale.alternatives_considered,
    confidence: rationale.confidence,
    runtime: {
      integration: opts.integration ?? "llm_guard",
      provider: opts.provider,
      model: opts.model,
      operation: opts.operation,
      tool: opts.tool,
      workflow: rationale.workflow,
      autonomy: rationale.autonomy,
    },
    risk_context: rationale.risk_context,
    safety: {
      hidden_reasoning_dropped: sanitized.hiddenReasoningDropped || undefined,
      forbidden_fields: sanitized.forbidden.length ? sanitized.forbidden : undefined,
    },
  };
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
  rationale?: AgentRationaleInput;
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

    const rationale = mergeRationaleInputs(opts.metadata, opts.rationale);
    const metadata: Record<string, unknown> = {
      skip_connector: true,
      integration_kind: "llm",
      provider: opts.provider,
      operation: opts.operation,
      ...(opts.metadata || {}),
      agent_rationale: buildAgentRationale({
        provider: opts.provider,
        operation: opts.operation,
        model: opts.model,
        tool: opts.toolName || toolName(opts.provider, opts.operation),
        rationale,
      }),
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
