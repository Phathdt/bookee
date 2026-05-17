import { Booking, BookingWithDetails } from '../entities/booking.entity';

export interface CreateBookingInput {
  tripId: number;
  seatIds: number[];
  passengers: { fullName: string; phone: string; idCard: string }[];
  couponCode?: string;
}

export interface BookingActor {
  userId: number | null;
  role?: string;
}

export abstract class IBookingsService {
  abstract create(input: CreateBookingInput, actor: BookingActor): Promise<BookingWithDetails>;
  abstract getByIdForUser(id: number, userId: number | null): Promise<BookingWithDetails>;
  abstract lookup(code: string, phone: string): Promise<BookingWithDetails>;
  abstract listByUser(userId: number): Promise<Booking[]>;
  abstract cancel(id: number, actor: BookingActor): Promise<void>;
}
