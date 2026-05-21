declare module "openai" {
  export default class OpenAI {
    constructor(opts?: { apiKey?: string });
    responses: {
      create(args: {
        model: string;
        input: unknown;
        [key: string]: unknown;
      }): Promise<unknown>;
    };
  }
}
