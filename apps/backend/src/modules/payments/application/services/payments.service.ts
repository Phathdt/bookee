import { Logger } from '@nestjs/common';

import { IBookingsRepository } from '@/modules/bookings/domain/interfaces/bookings.repository';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { generateQrDataUrl } from '@/modules/tickets/domain/qr-generator';
import { ITicketsRepository } from '@/modules/tickets/domain/interfaces/tickets.repository';
import { DatabaseService } from '@/modules/database/database.service';

import { Payment } from '../../domain/entities/payment.entity';
import {
  PaymentAmountMismatchError,
  PaymentBookingNotPendingError,
  PaymentNotFoundError,
  PaymentWebhookSignatureError,
} from '../../domain/errors';
import {
  CreateForBookingResult,
  IPaymentsService,
  PaymentActor,
} from '../../domain/interfaces/payments.service';
import { IPaymentsRepository } from '../../domain/interfaces/payments.repository';
import { PaymentProviderRegistry } from '../../infrastructure/provider-registry';

export class PaymentsService implements IPaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly payments: IPaymentsRepository,
    private readonly bookings: IBookingsRepository,
    private readonly tickets: ITicketsRepository,
    private readonly seatLock: ISeatLockService,
    private readonly registry: PaymentProviderRegistry,
    private readonly db: DatabaseService,
  ) {}

  async createForBooking(
    bookingId: number,
    provider: 'momo' | 'stripe',
    returnUrl: string,
    _actor: PaymentActor,
  ): Promise<CreateForBookingResult> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new PaymentNotFoundError(`Booking ${bookingId} not found`);
    }

    if (booking.status !== 'pending') {
      throw new PaymentBookingNotPendingError(
        `Booking ${bookingId} has status '${booking.status}' — only pending bookings can be paid`,
      );
    }

    const paymentProvider = this.registry.resolve(provider);
    const { transactionId, paymentUrl } = await paymentProvider.createPayment({
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        totalAmount: booking.totalAmount,
      },
      returnUrl,
    });

    const payment = await this.payments.create({
      bookingId: booking.id,
      provider,
      amount: booking.totalAmount,
      transactionId,
    });

    return { payment, paymentUrl };
  }

  async handleWebhook(
    providerName: 'momo' | 'stripe',
    headers: Record<string, string>,
    rawBody: string | Buffer,
  ): Promise<void> {
    const provider = this.registry.resolve(providerName);

    let verified;
    try {
      verified = await provider.verifyWebhook(headers, rawBody);
    } catch (err) {
      if (err instanceof PaymentWebhookSignatureError) throw err;
      throw new PaymentWebhookSignatureError('Webhook verification failed');
    }

    const payment = await this.payments.findByTransactionId(verified.transactionId);
    if (!payment) {
      this.logger.warn(
        `Webhook received for unknown transactionId: ${verified.transactionId} (provider: ${providerName})`,
      );
      return;
    }

    // Idempotency contract: if already succeeded, return 200 without re-confirming.
    // This stops the provider from retrying an already-processed webhook.
    if (payment.status === 'succeeded') {
      this.logger.log(
        `Idempotent webhook hit — payment ${payment.id} already succeeded (transactionId: ${verified.transactionId})`,
      );
      return;
    }

    if (verified.status === 'failed') {
      await this.payments.setStatus(payment.id, 'failed');
      this.logger.log(
        `Payment ${payment.id} marked failed (transactionId: ${verified.transactionId})`,
      );
      return;
    }

    if (verified.status === 'pending') {
      // Nothing to do yet — provider will send another webhook
      return;
    }

    // verified.status === 'succeeded'
    if (verified.amount !== payment.amount) {
      throw new PaymentAmountMismatchError(payment.amount, verified.amount);
    }

    await this.confirmPayment(payment);
  }

  async manualConfirm(
    paymentId: number,
    transactionId: string,
    actor: PaymentActor,
  ): Promise<void> {
    if (actor.role !== 'admin') {
      throw new Error('Only admins can manually confirm payments');
    }

    const payment = await this.payments.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError();

    // Idempotency: already confirmed
    if (payment.status === 'succeeded') {
      this.logger.log(`manualConfirm: payment ${paymentId} already succeeded — no-op`);
      return;
    }

    // Set the synthetic transactionId if it differs
    if (payment.transactionId !== transactionId) {
      await this.payments.setTransactionId(paymentId, transactionId);
    }

    await this.confirmPayment({ ...payment, transactionId });
  }

  async findById(id: number, _actor: PaymentActor): Promise<Payment> {
    const payment = await this.payments.findById(id);
    if (!payment) throw new PaymentNotFoundError();
    return payment;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Runs the confirmation transaction:
   *   1. Set payment.status = 'succeeded'
   *   2. Set booking.status = 'paid'
   *   3. Issue Ticket rows with QR codes for each BookingSeat
   * After the DB transaction, releases Redis seat lock (best-effort).
   */
  private async confirmPayment(payment: Payment): Promise<void> {
    const booking = await this.bookings.findById(payment.bookingId);
    if (!booking) {
      this.logger.error(`confirmPayment: booking ${payment.bookingId} not found`);
      return;
    }

    // Generate QR codes for each seat before the transaction (async, pure)
    const ticketInputs = await Promise.all(
      booking.seats.map(async (seat) => ({
        bookingSeatId: seat.id,
        qrCode: await generateQrDataUrl({
          bookingCode: booking.bookingCode,
          bookingSeatId: seat.id,
        }),
      })),
    );

    await this.db.$transaction(async (tx) => {
      // a. Set payment succeeded
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'succeeded' },
      });

      // b. Set booking paid
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'paid' },
      });

      // c. Issue tickets
      if (ticketInputs.length > 0) {
        await tx.ticket.createMany({
          data: ticketInputs.map((t) => ({
            bookingSeatId: t.bookingSeatId,
            qrCode: t.qrCode,
            status: 'valid',
          })),
          skipDuplicates: true,
        });
      }
    });

    this.logger.log(
      `Payment confirmed — paymentId=${payment.id} bookingId=${booking.id} transactionId=${payment.transactionId}`,
    );

    // Release Redis lock outside transaction — best effort.
    // The lock TTL would expire regardless; this just frees seats sooner.
    try {
      const seatIds = booking.seats.map((s) => s.seatId);
      await this.seatLock.release(booking.tripId, seatIds, booking.bookingCode);
    } catch (err) {
      this.logger.warn(`Failed to release seat lock for booking ${booking.id}: ${String(err)}`);
    }
  }
}
