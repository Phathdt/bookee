import Stripe from 'stripe';

import { PaymentWebhookSignatureError } from '../../domain/errors';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  IPaymentProvider,
  VerifiedWebhook,
} from '../../domain/interfaces/payment-provider';

export interface StripeProviderConfig {
  apiKey: string;
  webhookSecret: string;
}

type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
};

type StripePaymentIntent = {
  id: string;
  amount: number;
  metadata: Record<string, string>;
};

/**
 * Stripe payment provider.
 *
 * createPayment: returns a deterministic placeholder transactionId.
 * TODO: in production, create a Stripe PaymentIntent / CheckoutSession here.
 *
 * verifyWebhook: uses the official stripe SDK constructEvent() for
 * constant-time HMAC verification — handles the raw body requirement.
 */
export class StripeProvider extends IPaymentProvider {
  readonly name = 'stripe' as const;

  // The Stripe constructor is the default export — use `typeof Stripe` to type the instance.
  private readonly stripe: InstanceType<typeof Stripe>;

  constructor(private readonly config: StripeProviderConfig) {
    super();
    this.stripe = new Stripe(config.apiKey);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const transactionId = `stripe-${input.booking.bookingCode}-${Date.now()}`;

    // TODO: in production, create a Stripe PaymentIntent or CheckoutSession:
    //   const session = await this.stripe.checkout.sessions.create({ ... });
    //   return { transactionId: session.payment_intent, paymentUrl: session.url, ... };
    const paymentUrl = `https://checkout.stripe.com/pay/${transactionId}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    return { transactionId, paymentUrl, expiresAt };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string | Buffer,
  ): Promise<VerifiedWebhook> {
    const sig = headers['stripe-signature'] ?? headers['Stripe-Signature'];
    if (!sig) {
      throw new PaymentWebhookSignatureError('Missing stripe-signature header');
    }

    let event: StripeEvent;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        sig,
        this.config.webhookSecret,
      ) as StripeEvent;
    } catch {
      throw new PaymentWebhookSignatureError();
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as StripePaymentIntent;
      const bookingCode = intent.metadata?.bookingCode ?? '';

      return {
        transactionId: intent.id,
        status: 'succeeded',
        amount: intent.amount,
        bookingCode,
        rawPayload: event,
      };
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as StripePaymentIntent;
      const bookingCode = intent.metadata?.bookingCode ?? '';

      return {
        transactionId: intent.id,
        status: 'failed',
        amount: intent.amount,
        bookingCode,
        rawPayload: event,
      };
    }

    // For unhandled event types return pending so the service ignores them gracefully
    return {
      transactionId: event.id,
      status: 'pending',
      amount: 0,
      bookingCode: '',
      rawPayload: event,
    };
  }
}
