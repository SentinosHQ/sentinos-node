declare module "@openai/agents" {
  export class Agent {
    constructor(args: {
      name: string;
      instructions: string;
      model?: string;
      modelSettings?: Record<string, unknown>;
      toolUseBehavior?: string;
      tools?: unknown[];
    });
  }

  export function run(agent: unknown, input: string): Promise<Record<string, unknown>>;

  export function tool(args: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (input: Record<string, unknown>) => Promise<unknown>;
  }): unknown;
}
