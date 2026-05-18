import { DatabaseService } from '@/modules/database/database.service';

import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums';
import {
  CreatePaymentInput,
  IPaymentsRepository,
} from '../../domain/interfaces/payments.repository';

type PaymentRow = {
  id: number;
  bookingId: number;
  provider: string;
  amount: number;
  status: string;
  transactionId: string | null;
  rawPayload: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export class PaymentsRepositoryPrisma extends IPaymentsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: PaymentRow): Payment {
    return {
      id: row.id,
      bookingId: row.bookingId,
      provider: row.provider,
      amount: row.amount,
      status: row.status as PaymentStatus,
      transactionId: row.transactionId,
      rawPayload: row.rawPayload,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: number): Promise<Payment | null> {
    const row = await this.db.payment.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const row = await this.db.payment.findUnique({ where: { transactionId } });
    return row ? this.toEntity(row) : null;
  }

  async listByBooking(bookingId: number): Promise<Payment[]> {
    const rows = await this.db.payment.findMany({ where: { bookingId } });
    return rows.map((r) => this.toEntity(r));
  }

  async findPendingOlderThan(date: Date): Promise<Payment[]> {
    const rows = await this.db.payment.findMany({
      where: { status: 'pending', createdAt: { lt: date } },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const row = await this.db.payment.create({
      data: {
        bookingId: input.bookingId,
        provider: input.provider,
        amount: input.amount,
        transactionId: input.transactionId,
        rawPayload: input.rawPayload ? (input.rawPayload as object) : undefined,
        status: 'pending',
      },
    });
    return this.toEntity(row);
  }

  async setStatus(id: number, status: PaymentStatus): Promise<void> {
    await this.db.payment.update({ where: { id }, data: { status } });
  }

  async setTransactionId(id: number, transactionId: string): Promise<void> {
    await this.db.payment.update({ where: { id }, data: { transactionId } });
  }
}
