import { createHmac, timingSafeEqual } from 'node:crypto';

import { PaymentWebhookSignatureError } from '../../domain/errors';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  IPaymentProvider,
  VerifiedWebhook,
} from '../../domain/interfaces/payment-provider';

export interface MomoProviderConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  apiBase: string;
  returnUrl: string;
  notifyUrl: string;
}

/**
 * Momo payment provider.
 *
 * createPayment: generates a transactionId and placeholder paymentUrl.
 * TODO: replace stub with actual Momo createOrder HTTP call in production.
 *
 * verifyWebhook: rebuilds the HMAC-SHA256 signature from sorted query-style
 * params per Momo spec and performs a constant-time comparison.
 */
export class MomoProvider extends IPaymentProvider {
  readonly name = 'momo' as const;

  constructor(private readonly config: MomoProviderConfig) {
    super();
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const transactionId = `momo-${input.booking.bookingCode}-${Date.now()}`;

    // TODO: in production, POST to Momo createOrder endpoint here.
    // For MVP, return placeholder URL so the webhook flow can be tested.
    const paymentUrl = `${this.config.apiBase}/redirect?orderId=${transactionId}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    return { transactionId, paymentUrl, expiresAt };
  }

  async verifyWebhook(
    _headers: Record<string, string>,
    rawBody: string | Buffer,
  ): Promise<VerifiedWebhook> {
    const body =
      typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));

    // Momo sends signature built from sorted key=value pairs joined by '&'
    const { signature: receivedSig, ...rest } = body as Record<string, unknown>;

    if (typeof receivedSig !== 'string') {
      throw new PaymentWebhookSignatureError('Missing signature in Momo webhook payload');
    }

    const rawSignature = this.buildSignature(rest as Record<string, string>);

    if (!this.timingSafeCompare(rawSignature, receivedSig)) {
      throw new PaymentWebhookSignatureError();
    }

    const resultCode = Number((body as Record<string, unknown>).resultCode ?? -1);
    const status = resultCode === 0 ? 'succeeded' : 'failed';

    return {
      transactionId: String((body as Record<string, unknown>).orderId ?? ''),
      status,
      amount: Number((body as Record<string, unknown>).amount ?? 0),
      bookingCode: this.extractBookingCode(String((body as Record<string, unknown>).orderId ?? '')),
      rawPayload: body,
    };
  }

  /** Build HMAC-SHA256 signature from sorted params per Momo spec. */
  buildSignature(params: Record<string, string>): string {
    const raw = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return createHmac('sha256', this.config.secretKey).update(raw).digest('hex');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /** Extract bookingCode from transactionId format: momo-{bookingCode}-{timestamp} */
  private extractBookingCode(orderId: string): string {
    const parts = orderId.split('-');
    // format: momo-BOOKINGCODE-timestamp  → index 1
    if (parts.length >= 3) return parts[1]!;
    return orderId;
  }
}
