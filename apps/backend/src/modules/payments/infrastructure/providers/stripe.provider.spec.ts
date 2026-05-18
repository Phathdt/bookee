import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { PaymentWebhookSignatureError } from '../../domain/errors';
import { StripeProvider } from './stripe.provider';

const WEBHOOK_SECRET = 'whsec_test_integration_secret';

function makeProvider(): StripeProvider {
  return new StripeProvider({
    apiKey: 'sk_test_DEFER',
    webhookSecret: WEBHOOK_SECRET,
  });
}

describe('StripeProvider', () => {
  it('createPayment returns deterministic transactionId with bookingCode', async () => {
    const provider = makeProvider();
    const result = await provider.createPayment({
      booking: { id: 1, bookingCode: 'XYZ99999', totalAmount: 500_000 },
      returnUrl: 'http://localhost:5174/payment/return',
    });

    expect(result.transactionId).toMatch(/^stripe-XYZ99999-/);
    expect(result.paymentUrl).toContain(result.transactionId);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('verifyWebhook accepts a valid Stripe-signed payment_intent.succeeded event', async () => {
    const provider = makeProvider();

    // Build a real signed event using the Stripe test helper
    const stripe = new Stripe('sk_test_DEFER');
    const payload = JSON.stringify({
      id: 'evt_test_001',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_001',
          amount: 200_000,
          metadata: { bookingCode: 'BOOK0001' },
        },
      },
    });

    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const result = await provider.verifyWebhook({ 'stripe-signature': sig }, payload);

    expect(result.status).toBe('succeeded');
    expect(result.transactionId).toBe('pi_test_001');
    expect(result.amount).toBe(200_000);
    expect(result.bookingCode).toBe('BOOK0001');
  });

  it('verifyWebhook throws PaymentWebhookSignatureError with bad signature', async () => {
    const provider = makeProvider();
    const payload = JSON.stringify({ id: 'evt_x', type: 'payment_intent.succeeded', data: {} });

    await expect(
      provider.verifyWebhook({ 'stripe-signature': 't=1,v1=badsig' }, payload),
    ).rejects.toBeInstanceOf(PaymentWebhookSignatureError);
  });

  it('verifyWebhook throws PaymentWebhookSignatureError when stripe-signature header is missing', async () => {
    const provider = makeProvider();
    const payload = JSON.stringify({ id: 'evt_x', type: 'payment_intent.succeeded', data: {} });

    await expect(provider.verifyWebhook({}, payload)).rejects.toBeInstanceOf(
      PaymentWebhookSignatureError,
    );
  });

  it('verifyWebhook maps payment_intent.payment_failed to failed status', async () => {
    const provider = makeProvider();
    const stripe = new Stripe('sk_test_DEFER');
    const payload = JSON.stringify({
      id: 'evt_fail_001',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail_001',
          amount: 200_000,
          metadata: { bookingCode: 'BOOKFAIL' },
        },
      },
    });

    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const result = await provider.verifyWebhook({ 'stripe-signature': sig }, payload);

    expect(result.status).toBe('failed');
    expect(result.transactionId).toBe('pi_fail_001');
  });

  it('verifyWebhook returns pending for unhandled event types', async () => {
    const provider = makeProvider();
    const stripe = new Stripe('sk_test_DEFER');
    const payload = JSON.stringify({
      id: 'evt_other',
      type: 'customer.created',
      data: { object: {} },
    });

    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const result = await provider.verifyWebhook({ 'stripe-signature': sig }, payload);
    expect(result.status).toBe('pending');
  });
});
