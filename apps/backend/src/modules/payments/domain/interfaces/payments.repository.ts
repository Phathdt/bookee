import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums';

export interface CreatePaymentInput {
  bookingId: number;
  provider: string;
  amount: number;
  transactionId: string;
  rawPayload?: unknown;
}

export abstract class IPaymentsRepository {
  abstract findById(id: number): Promise<Payment | null>;
  abstract findByTransactionId(transactionId: string): Promise<Payment | null>;
  abstract listByBooking(bookingId: number): Promise<Payment[]>;
  abstract findPendingOlderThan(date: Date): Promise<Payment[]>;
  abstract create(input: CreatePaymentInput): Promise<Payment>;
  abstract setStatus(id: number, status: PaymentStatus): Promise<void>;
  abstract setTransactionId(id: number, transactionId: string): Promise<void>;
}
