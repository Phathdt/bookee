import { DatabaseService } from '@/modules/database/database.service';

import {
  Booking,
  BookingSeat,
  BookingWithDetails,
  Passenger,
} from '../../domain/entities/booking.entity';
import { BookingStatus } from '../../domain/enums';
import {
  CreateBookingInput,
  IBookingsRepository,
} from '../../domain/interfaces/bookings.repository';

type BookingRow = {
  id: number;
  bookingCode: string;
  userId: number | null;
  tripId: number;
  totalAmount: number;
  status: string;
  couponId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingSeatRow = {
  id: number;
  bookingId: number;
  seatId: number;
  price: number;
};

type PassengerRow = {
  id: number;
  bookingId: number;
  fullName: string;
  phone: string;
  idCardEncrypted: string;
};

export class BookingsRepositoryPrisma extends IBookingsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toBookingEntity(row: BookingRow): Booking {
    return {
      id: row.id,
      bookingCode: row.bookingCode,
      userId: row.userId,
      tripId: row.tripId,
      totalAmount: row.totalAmount,
      status: row.status as BookingStatus,
      couponId: row.couponId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toSeatEntity(row: BookingSeatRow): BookingSeat {
    return {
      id: row.id,
      bookingId: row.bookingId,
      seatId: row.seatId,
      price: row.price,
    };
  }

  private toPassengerEntity(row: PassengerRow): Passenger {
    return {
      id: row.id,
      bookingId: row.bookingId,
      fullName: row.fullName,
      phone: row.phone,
      idCardEncrypted: row.idCardEncrypted,
    };
  }

  private async loadDetails(booking: Booking): Promise<BookingWithDetails> {
    const [seatRows, passengerRows] = await Promise.all([
      this.db.bookingSeat.findMany({ where: { bookingId: booking.id } }),
      this.db.passenger.findMany({ where: { bookingId: booking.id } }),
    ]);
    return {
      ...booking,
      seats: seatRows.map((r) => this.toSeatEntity(r)),
      passengers: passengerRows.map((r) => this.toPassengerEntity(r)),
    };
  }

  async findById(id: number): Promise<BookingWithDetails | null> {
    const row = await this.db.booking.findUnique({ where: { id } });
    if (!row) return null;
    return this.loadDetails(this.toBookingEntity(row));
  }

  async findByCode(code: string): Promise<BookingWithDetails | null> {
    const row = await this.db.booking.findUnique({ where: { bookingCode: code } });
    if (!row) return null;
    return this.loadDetails(this.toBookingEntity(row));
  }

  async findByCodeAndPhone(code: string, phone: string): Promise<BookingWithDetails | null> {
    const booking = await this.db.booking.findUnique({ where: { bookingCode: code } });
    if (!booking) return null;

    // Check that at least one passenger on this booking has the given phone
    const passenger = await this.db.passenger.findFirst({
      where: { bookingId: booking.id, phone },
    });
    if (!passenger) return null;

    return this.loadDetails(this.toBookingEntity(booking));
  }

  async listByUser(userId: number): Promise<Booking[]> {
    const rows = await this.db.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toBookingEntity(r));
  }

  async create(input: CreateBookingInput): Promise<BookingWithDetails> {
    const result = await this.db.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingCode: input.bookingCode,
          userId: input.userId,
          tripId: input.tripId,
          totalAmount: input.totalAmount,
          couponId: input.couponId,
          status: 'pending',
        },
      });

      await tx.bookingSeat.createMany({
        data: input.seats.map((s) => ({
          bookingId: booking.id,
          seatId: s.seatId,
          price: s.price,
        })),
      });

      await tx.passenger.createMany({
        data: input.passengers.map((p) => ({
          bookingId: booking.id,
          fullName: p.fullName,
          phone: p.phone,
          idCardEncrypted: p.idCardEncrypted,
        })),
      });

      const seats = await tx.bookingSeat.findMany({ where: { bookingId: booking.id } });
      const passengers = await tx.passenger.findMany({ where: { bookingId: booking.id } });

      return { booking, seats, passengers };
    });

    return {
      ...this.toBookingEntity(result.booking),
      seats: result.seats.map((r) => this.toSeatEntity(r)),
      passengers: result.passengers.map((r) => this.toPassengerEntity(r)),
    };
  }

  async setStatus(id: number, status: BookingStatus): Promise<void> {
    await this.db.booking.update({ where: { id }, data: { status } });
  }

  async findPendingOlderThan(date: Date): Promise<BookingWithDetails[]> {
    const rows = await this.db.booking.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: date },
      },
    });
    return Promise.all(rows.map((r) => this.loadDetails(this.toBookingEntity(r))));
  }

  async countPaidSeatsForTrip(tripId: number): Promise<number> {
    // Find all paid booking IDs for the trip, then count their seats.
    const paidBookings = await this.db.booking.findMany({
      where: { tripId, status: 'paid' },
      select: { id: true },
    });
    if (paidBookings.length === 0) return 0;
    const bookingIds = paidBookings.map((b) => b.id);
    return this.db.bookingSeat.count({
      where: { bookingId: { in: bookingIds } },
    });
  }
}
