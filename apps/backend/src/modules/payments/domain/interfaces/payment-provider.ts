export interface CreatePaymentInput {
  booking: {
    id: number;
    bookingCode: string;
    totalAmount: number;
  };
  returnUrl: string;
}

export interface CreatePaymentResult {
  transactionId: string;
  paymentUrl: string;
  expiresAt: Date;
}

export interface VerifiedWebhook {
  transactionId: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  bookingCode: string;
  rawPayload: unknown;
}

/**
 * Abstract base class used as a DI token for payment providers.
 * Concrete implementations: MomoProvider, StripeProvider.
 * Extension point: add new providers (VNPay, ZaloPay) by implementing this class
 * and registering in PaymentProviderRegistry.
 */
export abstract class IPaymentProvider {
  abstract readonly name: 'momo' | 'stripe';

  abstract createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /**
   * Verify an inbound webhook from the provider.
   * MUST throw PaymentWebhookSignatureError on invalid or missing signature.
   */
  abstract verifyWebhook(
    headers: Record<string, string>,
    rawBody: string | Buffer,
  ): Promise<VerifiedWebhook>;
}
