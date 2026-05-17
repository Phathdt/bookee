import { Logger } from '@nestjs/common';

import { EncryptionService } from '@/modules/crypto/encryption.service';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { ITripsRepository } from '@/modules/trips/domain/interfaces/trips.repository';

import { generateBookingCode } from '../../domain/booking-code-generator';
import { Booking, BookingWithDetails } from '../../domain/entities/booking.entity';
import {
  BookingForbiddenError,
  BookingLookupNotFoundError,
  BookingNotFoundError,
  BookingNotPendingError,
  BookingValidationError,
  SeatUnavailableError,
} from '../../domain/errors';
import {
  BookingActor,
  CreateBookingInput,
  IBookingsService,
} from '../../domain/interfaces/bookings.service';
import { IBookingsRepository } from '../../domain/interfaces/bookings.repository';

const MAX_CODE_RETRIES = 5;
const LOCK_TTL_SECONDS = 600;

export class BookingsService implements IBookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly bookings: IBookingsRepository,
    private readonly seatLock: ISeatLockService,
    private readonly encryption: EncryptionService,
    private readonly trips: ITripsRepository,
  ) {}

  async create(input: CreateBookingInput, actor: BookingActor): Promise<BookingWithDetails> {
    // 9.6 — passenger count must match seat count
    if (input.passengers.length !== input.seatIds.length) {
      throw new BookingValidationError(
        `passengers.length (${input.passengers.length}) must equal seatIds.length (${input.seatIds.length})`,
      );
    }

    if (input.seatIds.length === 0) {
      throw new BookingValidationError('At least one seat must be selected');
    }

    // Validate trip exists and is schedulable
    const trip = await this.trips.findById(input.tripId);
    if (!trip) {
      throw new BookingValidationError(`Trip ${input.tripId} not found`);
    }
    if (trip.status !== 'scheduled') {
      throw new BookingValidationError(
        `Trip ${input.tripId} is not available for booking (status: ${trip.status})`,
      );
    }

    // 9.4 — generate booking code with collision retry
    const totalAmount = trip.basePrice * input.seatIds.length;
    const bookingCode = await this.generateUniqueCode();

    // 9.1/9.2 — atomic seat lock
    const lockResult = await this.seatLock.tryLock(
      input.tripId,
      input.seatIds,
      bookingCode,
      LOCK_TTL_SECONDS,
    );
    if (!lockResult.ok) {
      throw new SeatUnavailableError(lockResult.conflictingSeatIds ?? []);
    }

    // 9.5 — encrypt passenger idCards
    const encryptedPassengers = input.passengers.map((p) => ({
      fullName: p.fullName,
      phone: p.phone,
      idCardEncrypted: this.encryption.encrypt(p.idCard),
    }));

    // 9.3 — persist in single transaction; release lock on failure
    let booking: BookingWithDetails;
    try {
      booking = await this.bookings.create({
        bookingCode,
        userId: actor.userId,
        tripId: input.tripId,
        totalAmount,
        couponId: null, // coupon deferred to Section 11
        seats: input.seatIds.map((seatId) => ({ seatId, price: trip.basePrice })),
        passengers: encryptedPassengers,
      });
    } catch (err) {
      // Release the Redis lock so seats are not stranded
      this.logger.error('DB transaction failed — releasing seat locks', err);
      await this.seatLock.release(input.tripId, input.seatIds, bookingCode);
      throw err;
    }

    return this.withMaskedIdCards(booking);
  }

  async getByIdForUser(id: number, userId: number | null): Promise<BookingWithDetails> {
    const booking = await this.bookings.findById(id);
    if (!booking) throw new BookingNotFoundError();

    // Guests can only access guest bookings; authenticated users their own
    if (booking.userId !== userId) {
      throw new BookingForbiddenError();
    }

    return this.withMaskedIdCards(booking);
  }

  async lookup(code: string, phone: string): Promise<BookingWithDetails> {
    const booking = await this.bookings.findByCodeAndPhone(code, phone);
    if (!booking) throw new BookingLookupNotFoundError();
    return this.withMaskedIdCards(booking);
  }

  async listByUser(userId: number): Promise<Booking[]> {
    return this.bookings.listByUser(userId);
  }

  async cancel(id: number, actor: BookingActor): Promise<void> {
    const booking = await this.bookings.findById(id);
    if (!booking) throw new BookingNotFoundError();

    const isAdmin = actor.role === 'admin';
    if (!isAdmin && booking.userId !== actor.userId) {
      throw new BookingForbiddenError();
    }

    if (booking.status !== 'pending') {
      throw new BookingNotPendingError(`Cannot cancel booking with status '${booking.status}'`);
    }

    const seatIds = booking.seats.map((s) => s.seatId);
    await this.seatLock.release(booking.tripId, seatIds, booking.bookingCode);
    await this.bookings.setStatus(id, 'cancelled');
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateBookingCode();
      const existing = await this.bookings.findByCode(code);
      if (!existing) return code;
      this.logger.warn(`Booking code collision on attempt ${attempt + 1}: ${code}`);
    }
    throw new Error('Failed to generate a unique booking code after max retries');
  }

  private withMaskedIdCards(booking: BookingWithDetails): BookingWithDetails {
    return {
      ...booking,
      passengers: booking.passengers.map((p) => {
        let plainId: string;
        try {
          plainId = this.encryption.decrypt(p.idCardEncrypted);
        } catch {
          plainId = '????';
        }
        return {
          ...p,
          idCardEncrypted: this.encryption.maskIdCard(plainId),
        };
      }),
    };
  }
}
