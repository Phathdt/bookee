import { Booking, BookingWithDetails } from '../entities/booking.entity';
import { BookingStatus } from '../enums';

export interface CreateBookingInput {
  bookingCode: string;
  userId: number | null;
  tripId: number;
  totalAmount: number;
  couponId: number | null;
  seats: { seatId: number; price: number }[];
  passengers: { fullName: string; phone: string; idCardEncrypted: string }[];
}

export abstract class IBookingsRepository {
  abstract findById(id: number): Promise<BookingWithDetails | null>;
  abstract findByCode(code: string): Promise<BookingWithDetails | null>;
  abstract findByCodeAndPhone(code: string, phone: string): Promise<BookingWithDetails | null>;
  abstract listByUser(userId: number): Promise<Booking[]>;
  abstract create(input: CreateBookingInput): Promise<BookingWithDetails>;
  abstract setStatus(id: number, status: BookingStatus): Promise<void>;
  abstract findPendingOlderThan(date: Date): Promise<BookingWithDetails[]>;
}
