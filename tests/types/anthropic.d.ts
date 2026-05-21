declare module "@anthropic-ai/sdk" {
  export default class Anthropic {
    constructor(opts?: { apiKey?: string });
    messages: {
      create(args: {
        model: string;
        messages: Array<Record<string, unknown>>;
        [key: string]: unknown;
      }): Promise<unknown>;
    };
  }
}
