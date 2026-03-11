import { LLMGuard, type LLMPolicyResult } from "./llm.js";

type OpenAIChatCreateFn<T> = (args: {
  model: string;
  messages: Array<Record<string, unknown>>;
  [key: string]: unknown;
}) => Promise<T> | T;

type OpenAIResponsesCreateFn<T> = (args: {
  model: string;
  input: unknown;
  [key: string]: unknown;
}) => Promise<T> | T;

type AnthropicMessagesCreateFn<T> = (args: {
  model: string;
  messages: Array<Record<string, unknown>>;
  [key: string]: unknown;
}) => Promise<T> | T;

export class OpenAIChatCompletionsAdapter<T = unknown> {
  readonly guard: LLMGuard;
  readonly createFn: OpenAIChatCreateFn<T>;
  readonly provider: string;

  constructor(opts: { guard: LLMGuard; createFn: OpenAIChatCreateFn<T>; provider?: string }) {
    this.guard = opts.guard;
    this.createFn = opts.createFn;
    this.provider = opts.provider ?? "openai";
  }

  static fromClient<T = unknown>(opts: { guard: LLMGuard; client: { chat: { completions: { create: OpenAIChatCreateFn<T> } } }; provider?: string }) {
    return new OpenAIChatCompletionsAdapter<T>({
      guard: opts.guard,
      createFn: opts.client.chat.completions.create.bind(opts.client.chat.completions),
      provider: opts.provider,
    });
  }

  async create(args: {
    model: string;
    messages: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    tenantId?: string;
    orgId?: string;
    [key: string]: unknown;
  }): Promise<LLMPolicyResult<T>> {
    const { model, messages, metadata, tenantId, orgId, ...rest } = args;
    const request: Record<string, unknown> = { model, messages };
    if (Object.keys(rest).length) request.params = rest;
    return this.guard.run({
      provider: this.provider,
      operation: "chat.completions",
      request,
      model,
      metadata,
      tenantId,
      orgId,
      invoke: () => this.createFn({ model, messages, ...rest }),
    });
  }
}

export class OpenAIResponsesAdapter<T = unknown> {
  readonly guard: LLMGuard;
  readonly createFn: OpenAIResponsesCreateFn<T>;
  readonly provider: string;

  constructor(opts: { guard: LLMGuard; createFn: OpenAIResponsesCreateFn<T>; provider?: string }) {
    this.guard = opts.guard;
    this.createFn = opts.createFn;
    this.provider = opts.provider ?? "openai";
  }

  static fromClient<T = unknown>(opts: { guard: LLMGuard; client: { responses: { create: OpenAIResponsesCreateFn<T> } }; provider?: string }) {
    return new OpenAIResponsesAdapter<T>({
      guard: opts.guard,
      createFn: opts.client.responses.create.bind(opts.client.responses),
      provider: opts.provider,
    });
  }

  async create(args: {
    model: string;
    input: unknown;
    metadata?: Record<string, unknown>;
    tenantId?: string;
    orgId?: string;
    [key: string]: unknown;
  }): Promise<LLMPolicyResult<T>> {
    const { model, input, metadata, tenantId, orgId, ...rest } = args;
    const request: Record<string, unknown> = { model, input };
    if (Object.keys(rest).length) request.params = rest;
    return this.guard.run({
      provider: this.provider,
      operation: "responses.create",
      request,
      model,
      metadata,
      tenantId,
      orgId,
      invoke: () => this.createFn({ model, input, ...rest }),
    });
  }
}

export class AnthropicMessagesAdapter<T = unknown> {
  readonly guard: LLMGuard;
  readonly createFn: AnthropicMessagesCreateFn<T>;

  constructor(opts: { guard: LLMGuard; createFn: AnthropicMessagesCreateFn<T> }) {
    this.guard = opts.guard;
    this.createFn = opts.createFn;
  }

  static fromClient<T = unknown>(opts: { guard: LLMGuard; client: { messages: { create: AnthropicMessagesCreateFn<T> } } }) {
    return new AnthropicMessagesAdapter<T>({
      guard: opts.guard,
      createFn: opts.client.messages.create.bind(opts.client.messages),
    });
  }

  async create(args: {
    model: string;
    messages: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    tenantId?: string;
    orgId?: string;
    [key: string]: unknown;
  }): Promise<LLMPolicyResult<T>> {
    const { model, messages, metadata, tenantId, orgId, ...rest } = args;
    const request: Record<string, unknown> = { model, messages };
    if (Object.keys(rest).length) request.params = rest;
    return this.guard.run({
      provider: "anthropic",
      operation: "messages.create",
      request,
      model,
      metadata,
      tenantId,
      orgId,
      invoke: () => this.createFn({ model, messages, ...rest }),
    });
  }
}

export function createOpenAIChatAdapter<T = unknown>(opts: { guard: LLMGuard; client: { chat: { completions: { create: OpenAIChatCreateFn<T> } } } }) {
  return OpenAIChatCompletionsAdapter.fromClient(opts);
}

export function createOpenAIResponsesAdapter<T = unknown>(opts: { guard: LLMGuard; client: { responses: { create: OpenAIResponsesCreateFn<T> } } }) {
  return OpenAIResponsesAdapter.fromClient(opts);
}

export function createAnthropicMessagesAdapter<T = unknown>(opts: { guard: LLMGuard; client: { messages: { create: AnthropicMessagesCreateFn<T> } } }) {
  return AnthropicMessagesAdapter.fromClient(opts);
}

export function createOpenRouterChatAdapter<T = unknown>(opts: { guard: LLMGuard; client: { chat: { completions: { create: OpenAIChatCreateFn<T> } } } }) {
  return OpenAIChatCompletionsAdapter.fromClient({ ...opts, provider: "openrouter" });
}

export function createOpenRouterResponsesAdapter<T = unknown>(opts: { guard: LLMGuard; client: { responses: { create: OpenAIResponsesCreateFn<T> } } }) {
  return OpenAIResponsesAdapter.fromClient({ ...opts, provider: "openrouter" });
}
