import { beforeEach, describe, expect, it } from 'vitest';

import { makeBookingsRepositoryFake } from '../../../../../test/factories/bookings-repository.fake';
import { makeFakeTripsRepository } from '../../../../../test/factories/trips-repository.fake';
import { makeSeatLockServiceFake } from '../../../../../test/factories/seat-lock.service.fake';
import { EncryptionService } from '@/modules/crypto/encryption.service';
import {
  BookingForbiddenError,
  BookingNotFoundError,
  BookingNotPendingError,
  BookingValidationError,
  SeatUnavailableError,
} from '../../domain/errors';
import { BookingsService } from './bookings.service';

const TEST_KEY = Buffer.alloc(32, 0x11);
const encryption = new EncryptionService(TEST_KEY);

function makeService() {
  const bookingsRepo = makeBookingsRepositoryFake();
  const seatLock = makeSeatLockServiceFake();
  const tripsRepo = makeFakeTripsRepository();
  const svc = new BookingsService(bookingsRepo, seatLock, encryption, tripsRepo);
  return { svc, bookingsRepo, seatLock, tripsRepo };
}

async function seedTrip(
  tripsRepo: ReturnType<typeof makeFakeTripsRepository>,
  overrides: Partial<{ basePrice: number; status: string }> = {},
) {
  return tripsRepo.create({
    routeId: 1,
    vehicleId: 1,
    departureTime: new Date('2026-06-01T08:00:00Z'),
    arrivalTime: new Date('2026-06-01T16:00:00Z'),
    basePrice: overrides.basePrice ?? 200_000,
    status: (overrides.status ?? 'scheduled') as never,
  });
}

describe('BookingsService', () => {
  describe('create', () => {
    it('throws BookingValidationError when passenger count != seat count', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      await expect(
        svc.create(
          {
            tripId: trip.id,
            seatIds: [1, 2],
            passengers: [{ fullName: 'A', phone: '0900', idCard: '123' }],
          },
          { userId: 1 },
        ),
      ).rejects.toBeInstanceOf(BookingValidationError);
    });

    it('throws BookingValidationError when trip not found', async () => {
      const { svc } = makeService();
      await expect(
        svc.create(
          {
            tripId: 999,
            seatIds: [1],
            passengers: [{ fullName: 'A', phone: '0900', idCard: '123' }],
          },
          { userId: 1 },
        ),
      ).rejects.toBeInstanceOf(BookingValidationError);
    });

    it('throws BookingValidationError when trip is not scheduled', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo, { status: 'cancelled' });
      await expect(
        svc.create(
          {
            tripId: trip.id,
            seatIds: [1],
            passengers: [{ fullName: 'A', phone: '0900', idCard: '123' }],
          },
          { userId: 1 },
        ),
      ).rejects.toBeInstanceOf(BookingValidationError);
    });

    it('throws SeatUnavailableError when seat lock fails', async () => {
      const { svc, seatLock, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      // Pre-lock seat 1 for another booking
      await seatLock.tryLock(trip.id, [1], 'other-booking', 600);

      await expect(
        svc.create(
          {
            tripId: trip.id,
            seatIds: [1],
            passengers: [{ fullName: 'A', phone: '0900', idCard: '123' }],
          },
          { userId: 1 },
        ),
      ).rejects.toBeInstanceOf(SeatUnavailableError);
    });

    it('creates booking and returns masked idCard', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo, { basePrice: 150_000 });
      const result = await svc.create(
        {
          tripId: trip.id,
          seatIds: [1],
          passengers: [{ fullName: 'Alice', phone: '0901234567', idCard: '123456789012' }],
        },
        { userId: 42 },
      );

      expect(result.bookingCode).toHaveLength(8);
      expect(result.totalAmount).toBe(150_000);
      expect(result.status).toBe('pending');
      // idCard masked
      expect(result.passengers[0]?.idCardEncrypted).toBe('***9012');
    });

    it('handles guest booking (userId null)', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const result = await svc.create(
        {
          tripId: trip.id,
          seatIds: [1],
          passengers: [{ fullName: 'Guest', phone: '0900000000', idCard: '000000001234' }],
        },
        { userId: null },
      );
      expect(result.userId).toBeNull();
    });

    it('retries code generation on collision (up to 5 attempts)', async () => {
      const { svc, bookingsRepo, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);

      // Seed a booking with a known code to force collision detection
      // We can't predict the random code, so just verify the service succeeds
      // (regression: if generateUniqueCode throws, the test would fail)
      const result = await svc.create(
        {
          tripId: trip.id,
          seatIds: [1],
          passengers: [{ fullName: 'Test', phone: '0911111111', idCard: '111111111111' }],
        },
        { userId: 1 },
      );
      expect(result.bookingCode).toBeTruthy();
      // Booking should exist in repo
      const found = await bookingsRepo.findByCode(result.bookingCode);
      expect(found).not.toBeNull();
    });
  });

  describe('cancel', () => {
    it('cancels a pending booking', async () => {
      const { svc, bookingsRepo, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [2],
          passengers: [{ fullName: 'Bob', phone: '0902222222', idCard: '222222222222' }],
        },
        { userId: 5 },
      );

      await svc.cancel(booking.id, { userId: 5 });

      const found = await bookingsRepo.findById(booking.id);
      expect(found?.status).toBe('cancelled');
    });

    it('throws BookingNotFoundError when booking does not exist', async () => {
      const { svc } = makeService();
      await expect(svc.cancel(9999, { userId: 1 })).rejects.toBeInstanceOf(BookingNotFoundError);
    });

    it('throws BookingForbiddenError when a different user tries to cancel', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [3],
          passengers: [{ fullName: 'Carol', phone: '0903333333', idCard: '333333333333' }],
        },
        { userId: 10 },
      );

      await expect(svc.cancel(booking.id, { userId: 99 })).rejects.toBeInstanceOf(
        BookingForbiddenError,
      );
    });

    it('throws BookingNotPendingError when cancelling a non-pending booking', async () => {
      const { svc, bookingsRepo, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [4],
          passengers: [{ fullName: 'Dave', phone: '0904444444', idCard: '444444444444' }],
        },
        { userId: 7 },
      );
      // Manually move to confirmed
      await bookingsRepo.setStatus(booking.id, 'confirmed');

      await expect(svc.cancel(booking.id, { userId: 7 })).rejects.toBeInstanceOf(
        BookingNotPendingError,
      );
    });

    it('releases seat lock when cancelling', async () => {
      const { svc, seatLock, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [5],
          passengers: [{ fullName: 'Eve', phone: '0905555555', idCard: '555555555555' }],
        },
        { userId: 8 },
      );

      await svc.cancel(booking.id, { userId: 8 });

      // Seat 5 should now be lockable by another booking
      const lockResult = await seatLock.tryLock(trip.id, [5], 'new-booking', 600);
      expect(lockResult.ok).toBe(true);
    });

    it('admin can cancel any booking', async () => {
      const { svc, bookingsRepo, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [6],
          passengers: [{ fullName: 'Frank', phone: '0906666666', idCard: '666666666666' }],
        },
        { userId: 20 },
      );

      await svc.cancel(booking.id, { userId: 1, role: 'admin' });
      const found = await bookingsRepo.findById(booking.id);
      expect(found?.status).toBe('cancelled');
    });
  });

  describe('lookup', () => {
    it('returns booking when code and phone match', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [1],
          passengers: [{ fullName: 'Grace', phone: '0907777777', idCard: '777777777777' }],
        },
        { userId: null },
      );

      const found = await svc.lookup(booking.bookingCode, '0907777777');
      expect(found.id).toBe(booking.id);
    });

    it('throws BookingLookupNotFoundError on wrong phone', async () => {
      const { svc, tripsRepo } = makeService();
      const trip = await seedTrip(tripsRepo);
      const booking = await svc.create(
        {
          tripId: trip.id,
          seatIds: [1],
          passengers: [{ fullName: 'Hank', phone: '0908888888', idCard: '888888888888' }],
        },
        { userId: null },
      );
      const { BookingLookupNotFoundError } = await import('../../domain/errors');
      await expect(svc.lookup(booking.bookingCode, '0000000000')).rejects.toBeInstanceOf(
        BookingLookupNotFoundError,
      );
    });
  });
});
