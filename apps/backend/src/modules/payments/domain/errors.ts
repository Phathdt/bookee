export class PaymentNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Payment not found') {
    super(message);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentBookingNotPendingError extends Error {
  readonly kind = 'booking_not_pending' as const;
  constructor(message = 'Booking is not in pending status — cannot initiate payment') {
    super(message);
    this.name = 'PaymentBookingNotPendingError';
  }
}

export class PaymentAmountMismatchError extends Error {
  readonly kind = 'amount_mismatch' as const;
  constructor(expected: number, received: number) {
    super(`Payment amount mismatch: expected ${expected}, received ${received}`);
    this.name = 'PaymentAmountMismatchError';
  }
}

export class PaymentWebhookSignatureError extends Error {
  readonly kind = 'invalid_signature' as const;
  constructor(message = 'Webhook signature verification failed') {
    super(message);
    this.name = 'PaymentWebhookSignatureError';
  }
}

export class PaymentAlreadyProcessedError extends Error {
  readonly kind = 'already_processed' as const;
  constructor(transactionId: string) {
    super(`Payment with transactionId '${transactionId}' has already been processed`);
    this.name = 'PaymentAlreadyProcessedError';
  }
}
