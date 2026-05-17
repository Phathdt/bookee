import { Booking, BookingWithDetails } from '@/modules/bookings/domain/entities/booking.entity';
import { BookingStatus } from '@/modules/bookings/domain/enums';
import {
  CreateBookingInput,
  IBookingsRepository,
} from '@/modules/bookings/domain/interfaces/bookings.repository';

/**
 * In-memory IBookingsRepository for unit tests.
 * Exposes _backdateAll() helper for expire-job tests.
 */
export interface FakeBookingsRepository extends IBookingsRepository {
  /** Backdate all stored bookings' createdAt to the given date. */
  _backdateAll(date: Date): void;
}

export function makeBookingsRepositoryFake(): FakeBookingsRepository {
  const store = new Map<number, BookingWithDetails>();
  let nextId = 1;
  let nextSeatId = 1;
  let nextPassengerId = 1;

  const repo: FakeBookingsRepository = {
    async findById(id: number): Promise<BookingWithDetails | null> {
      return store.get(id) ?? null;
    },

    async findByCode(code: string): Promise<BookingWithDetails | null> {
      for (const b of store.values()) {
        if (b.bookingCode === code) return b;
      }
      return null;
    },

    async findByCodeAndPhone(code: string, phone: string): Promise<BookingWithDetails | null> {
      for (const b of store.values()) {
        if (b.bookingCode !== code) continue;
        const hasPhone = b.passengers.some((p) => p.phone === phone);
        if (hasPhone) return b;
      }
      return null;
    },

    async listByUser(userId: number): Promise<Booking[]> {
      return [...store.values()].filter((b) => b.userId === userId);
    },

    async create(input: CreateBookingInput): Promise<BookingWithDetails> {
      const id = nextId++;
      const now = new Date();
      const booking: BookingWithDetails = {
        id,
        bookingCode: input.bookingCode,
        userId: input.userId,
        tripId: input.tripId,
        totalAmount: input.totalAmount,
        status: 'pending',
        couponId: input.couponId,
        createdAt: now,
        updatedAt: now,
        seats: input.seats.map((s) => ({
          id: nextSeatId++,
          bookingId: id,
          seatId: s.seatId,
          price: s.price,
        })),
        passengers: input.passengers.map((p) => ({
          id: nextPassengerId++,
          bookingId: id,
          fullName: p.fullName,
          phone: p.phone,
          idCardEncrypted: p.idCardEncrypted,
        })),
      };
      store.set(id, booking);
      return booking;
    },

    async setStatus(id: number, status: BookingStatus): Promise<void> {
      const existing = store.get(id);
      if (existing) {
        store.set(id, { ...existing, status, updatedAt: new Date() });
      }
    },

    async findPendingOlderThan(date: Date): Promise<BookingWithDetails[]> {
      return [...store.values()].filter((b) => b.status === 'pending' && b.createdAt < date);
    },

    _backdateAll(date: Date): void {
      for (const [id, booking] of store.entries()) {
        store.set(id, { ...booking, createdAt: date });
      }
    },
  };

  return repo;
}
