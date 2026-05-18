import { Payment } from '../entities/payment.entity';

export interface CreateForBookingResult {
  payment: Payment;
  paymentUrl: string;
}

export interface PaymentActor {
  userId: number | null;
  role?: string;
}

export abstract class IPaymentsService {
  /**
   * Initiate a payment for a pending booking.
   * Throws PaymentBookingNotPendingError if booking.status !== 'pending'.
   */
  abstract createForBooking(
    bookingId: number,
    provider: 'momo' | 'stripe',
    returnUrl: string,
    actor: PaymentActor,
  ): Promise<CreateForBookingResult>;

  /**
   * Handle an inbound provider webhook.
   * Idempotent: a second call with the same transactionId for an already-succeeded
   * payment returns without re-running the confirmation transaction.
   */
  abstract handleWebhook(
    providerName: 'momo' | 'stripe',
    headers: Record<string, string>,
    rawBody: string | Buffer,
  ): Promise<void>;

  /**
   * Admin-only: force-confirm a payment by synthetic transactionId.
   * Follows the same internal confirmation path as a successful webhook.
   */
  abstract manualConfirm(
    paymentId: number,
    transactionId: string,
    actor: PaymentActor,
  ): Promise<void>;

  /** Retrieve a single payment (admin or booking owner). */
  abstract findById(id: number, actor: PaymentActor): Promise<Payment>;
}
