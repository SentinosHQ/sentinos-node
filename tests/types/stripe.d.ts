declare module "stripe" {
  export default class Stripe {
    constructor(apiKey: string, opts?: { apiVersion?: string });
    refunds: {
      create(args: {
        payment_intent: string;
        amount: number;
        reason?: string;
        metadata?: Record<string, string>;
      }): Promise<Record<string, unknown>>;
    };
  }
}
