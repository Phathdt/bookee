import { describe, expect, it } from 'vitest';

import { PaymentWebhookSignatureError } from '../../domain/errors';
import { MomoProvider } from './momo.provider';

const TEST_SECRET = 'test-momo-secret-32-chars-padded!!';

function makeProvider(): MomoProvider {
  return new MomoProvider({
    partnerCode: 'MOMO_TEST',
    accessKey: 'MOMO_ACCESS',
    secretKey: TEST_SECRET,
    apiBase: 'https://test-payment.momo.vn',
    returnUrl: 'http://localhost:5174/payment/return',
    notifyUrl: 'http://localhost:3000/api/v1/payments/webhooks/momo',
  });
}

describe('MomoProvider', () => {
  it('createPayment returns transactionId with bookingCode and paymentUrl', async () => {
    const provider = makeProvider();
    const result = await provider.createPayment({
      booking: { id: 1, bookingCode: 'ABC12345', totalAmount: 200_000 },
      returnUrl: 'http://localhost:5174/payment/return',
    });

    expect(result.transactionId).toMatch(/^momo-ABC12345-/);
    expect(result.paymentUrl).toContain(result.transactionId);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verifyWebhook accepts a correctly signed payload', async () => {
    const provider = makeProvider();
    const orderId = 'momo-ABC12345-1234567890';
    const params: Record<string, string> = {
      orderId,
      amount: '200000',
      resultCode: '0',
    };
    const signature = provider.buildSignature(params);
    const body = { ...params, signature };

    const result = await provider.verifyWebhook({}, JSON.stringify(body));

    expect(result.status).toBe('succeeded');
    expect(result.transactionId).toBe(orderId);
    expect(result.amount).toBe(200_000);
    expect(result.bookingCode).toBe('ABC12345');
  });

  it('verifyWebhook throws PaymentWebhookSignatureError on wrong signature', async () => {
    const provider = makeProvider();
    const body = {
      orderId: 'momo-ABC12345-1234567890',
      amount: '200000',
      resultCode: '0',
      signature: 'badsignature',
    };

    await expect(provider.verifyWebhook({}, JSON.stringify(body))).rejects.toBeInstanceOf(
      PaymentWebhookSignatureError,
    );
  });

  it('verifyWebhook throws when signature field is missing', async () => {
    const provider = makeProvider();
    const body = { orderId: 'momo-TEST-111', amount: '100', resultCode: '0' };

    await expect(provider.verifyWebhook({}, JSON.stringify(body))).rejects.toBeInstanceOf(
      PaymentWebhookSignatureError,
    );
  });

  it('verifyWebhook maps resultCode != 0 to failed status', async () => {
    const provider = makeProvider();
    const orderId = 'momo-ABC12345-1234567890';
    const params: Record<string, string> = {
      orderId,
      amount: '200000',
      resultCode: '9000',
    };
    const signature = provider.buildSignature(params);
    const body = { ...params, signature };

    const result = await provider.verifyWebhook({}, JSON.stringify(body));
    expect(result.status).toBe('failed');
  });
});
