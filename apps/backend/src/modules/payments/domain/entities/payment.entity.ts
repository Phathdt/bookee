import { PaymentStatus } from '../enums';

export interface Payment {
  id: number;
  bookingId: number;
  provider: string;
  amount: number;
  status: PaymentStatus;
  transactionId: string | null;
  rawPayload: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}
