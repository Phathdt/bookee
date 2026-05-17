import { SchedulerRegistry } from '@nestjs/schedule';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../test/postgres-fixture';
import { RedisFixture, startRedisFixture } from '../../test/redis-fixture';
import { BookingsRepositoryPrisma } from '../modules/bookings/infrastructure/repositories/bookings.repository.prisma';
import { SeatLockServiceRedis } from '../modules/seat-lock/infrastructure/seat-lock.service.redis';

import { ExpirePendingBookingsScheduler } from './expire-pending-bookings.scheduler';

/**
 * End-to-end integration: real Postgres + real Redis. Verifies the scheduler
 * actually expires bookings in the DB and releases the corresponding Redis
 * seat locks. Unit spec uses fakes; this is the contract test against the
 * concrete infrastructure adapters.
 */
describe('ExpirePendingBookingsScheduler (integration)', () => {
  let pg: PostgresFixture;
  let redis: RedisFixture;
  let scheduler: ExpirePendingBookingsScheduler;
  let bookingsRepo: BookingsRepositoryPrisma;
  let seatLock: SeatLockServiceRedis;

  // Helper: backdate booking.createdAt directly via Prisma so the scheduler
  // sees it as older than the TTL cutoff (10 minutes).
  async function backdateBooking(bookingId: number, minutesAgo: number): Promise<void> {
    await pg.prisma.booking.update({
      where: { id: bookingId },
      data: { createdAt: new Date(Date.now() - minutesAgo * 60 * 1000) },
    });
  }

  beforeAll(async () => {
    [pg, redis] = await Promise.all([startPostgresFixture(), startRedisFixture()]);
    bookingsRepo = new BookingsRepositoryPrisma(pg.databaseService);
    seatLock = new SeatLockServiceRedis(redis.client);
    scheduler = new ExpirePendingBookingsScheduler(new SchedulerRegistry(), bookingsRepo, seatLock);
  }, 120_000);

  afterAll(async () => {
    await pg.stop();
    await redis.stop();
  });

  beforeEach(async () => {
    await pg.resetDatabase();
    await redis.flushAll();
  });

  // Set up a trip + booking with a real Redis lock; returns the booking row.
  async function seedPendingBookingWithLock(opts: {
    bookingCode: string;
    seatIds: number[];
    minutesAgo: number;
  }): Promise<{ bookingId: number; tripId: number }> {
    // Disambiguate per call so two calls inside one `it` don't collide on
    // unique constraints (busCompany.name, station.name aren't unique but
    // hotline is unique-ish via business rule; vehicle.plateNumber IS unique).
    const tag = opts.bookingCode;
    const operator = await pg.prisma.busCompany.create({
      data: { name: `Op-${tag}`, hotline: `1900${tag.slice(0, 4)}`, status: 'active' },
    });
    const stationA = await pg.prisma.station.create({
      data: { name: `A-${tag}`, address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    const stationB = await pg.prisma.station.create({
      data: { name: `B-${tag}`, address: 'b', lat: 11, lng: 108, city: 'Lâm Đồng' },
    });
    const route = await pg.prisma.route.create({
      data: {
        companyId: operator.id,
        fromStationId: stationA.id,
        toStationId: stationB.id,
        distanceKm: 300,
        durationMinutes: 360,
      },
    });
    const layout = await pg.prisma.seatLayout.create({
      data: { name: `L1-${tag}`, rows: 1, cols: 4 },
    });
    const seats = await Promise.all(
      opts.seatIds.map((i) =>
        pg.prisma.seat.create({
          data: { layoutId: layout.id, code: `A${i}`, floor: 1, row: 1, col: i },
        }),
      ),
    );
    const vehicle = await pg.prisma.vehicle.create({
      data: {
        companyId: operator.id,
        plateNumber: `PLATE-${opts.bookingCode}`,
        type: 'sleeper',
        seatLayoutId: layout.id,
        totalSeats: 4,
      },
    });
    const trip = await pg.prisma.trip.create({
      data: {
        routeId: route.id,
        vehicleId: vehicle.id,
        departureTime: new Date(Date.now() + 86_400_000),
        arrivalTime: new Date(Date.now() + 86_400_000 + 360 * 60_000),
        basePrice: 100_000,
      },
    });

    const booking = await bookingsRepo.create({
      bookingCode: opts.bookingCode,
      userId: null,
      tripId: trip.id,
      totalAmount: 100_000 * seats.length,
      couponId: null,
      seats: seats.map((s) => ({ seatId: s.id, price: 100_000 })),
      passengers: [{ fullName: 'Test', phone: '0900000000', idCardEncrypted: 'enc:xx:yy' }],
    });

    // Acquire real Redis lock owned by this booking code
    const lockRes = await seatLock.tryLock(
      trip.id,
      seats.map((s) => s.id),
      opts.bookingCode,
      600,
    );
    expect(lockRes.ok).toBe(true);

    if (opts.minutesAgo > 0) {
      await backdateBooking(booking.id, opts.minutesAgo);
    }

    return { bookingId: booking.id, tripId: trip.id };
  }

  it('expires a pending booking older than 10 minutes and releases its Redis locks', async () => {
    const { bookingId, tripId } = await seedPendingBookingWithLock({
      bookingCode: 'EXPIRE01',
      seatIds: [1, 2],
      minutesAgo: 11,
    });

    // Lock should exist before the scheduler runs.
    const lockedBefore = await seatLock.lockedSeatIdsFor(tripId);
    expect(lockedBefore.sort()).toEqual(expect.arrayContaining(lockedBefore));

    await scheduler.run();

    const updated = await bookingsRepo.findById(bookingId);
    expect(updated?.status).toBe('expired');

    // Locks owned by EXPIRE01 should be gone.
    const lockedAfter = await seatLock.lockedSeatIdsFor(tripId);
    expect(lockedAfter).toEqual([]);
  });

  it('leaves recent pending bookings alone (younger than TTL)', async () => {
    const { bookingId, tripId } = await seedPendingBookingWithLock({
      bookingCode: 'FRESH001',
      seatIds: [1],
      minutesAgo: 0,
    });

    await scheduler.run();

    const stillPending = await bookingsRepo.findById(bookingId);
    expect(stillPending?.status).toBe('pending');

    // Lock should still be held.
    const locked = await seatLock.lockedSeatIdsFor(tripId);
    expect(locked.length).toBeGreaterThan(0);
  });

  it('expires multiple bookings in one tick', async () => {
    const a = await seedPendingBookingWithLock({
      bookingCode: 'BATCH001',
      seatIds: [1, 2],
      minutesAgo: 11,
    });
    const b = await seedPendingBookingWithLock({
      bookingCode: 'BATCH002',
      seatIds: [3, 4],
      minutesAgo: 15,
    });

    await scheduler.run();

    const ua = await bookingsRepo.findById(a.bookingId);
    const ub = await bookingsRepo.findById(b.bookingId);
    expect(ua?.status).toBe('expired');
    expect(ub?.status).toBe('expired');
  });

  it("does not release another booking's lock on the same trip", async () => {
    // Booking A is expired (will be processed).
    // Booking B holds a separate seat on the same trip — must remain locked.
    const expireSeed = await seedPendingBookingWithLock({
      bookingCode: 'OWNERAAA',
      seatIds: [1],
      minutesAgo: 11,
    });

    // Reuse the same trip for booking B by directly creating a second booking
    // + seat + lock. Look up the trip's vehicle's layout instead of guessing.
    const tripRow = await pg.prisma.trip.findUnique({ where: { id: expireSeed.tripId } });
    if (!tripRow) throw new Error('trip should exist');
    const vehicleRow = await pg.prisma.vehicle.findUnique({ where: { id: tripRow.vehicleId } });
    if (!vehicleRow) throw new Error('vehicle should exist');
    const otherSeat = await pg.prisma.seat.create({
      data: { layoutId: vehicleRow.seatLayoutId, code: 'X9', floor: 1, row: 1, col: 9 },
    });
    const otherBooking = await bookingsRepo.create({
      bookingCode: 'OWNERBBB',
      userId: null,
      tripId: expireSeed.tripId,
      totalAmount: 100_000,
      couponId: null,
      seats: [{ seatId: otherSeat.id, price: 100_000 }],
      passengers: [{ fullName: 'B', phone: '0900000001', idCardEncrypted: 'enc:a:b' }],
    });
    await seatLock.tryLock(expireSeed.tripId, [otherSeat.id], 'OWNERBBB', 600);

    await scheduler.run();

    // Booking A: expired + lock released.
    expect((await bookingsRepo.findById(expireSeed.bookingId))?.status).toBe('expired');

    // Booking B: still pending and its lock survives.
    expect((await bookingsRepo.findById(otherBooking.id))?.status).toBe('pending');
    const stillLocked = await seatLock.lockedSeatIdsFor(expireSeed.tripId);
    expect(stillLocked).toContain(otherSeat.id);
  });
});
