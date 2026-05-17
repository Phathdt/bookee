import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { BookingsRepositoryPrisma } from './bookings.repository.prisma';

describe('BookingsRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: BookingsRepositoryPrisma;
  let tripId: number;
  let seatId1: number;
  let seatId2: number;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new BookingsRepositoryPrisma(fx.databaseService);
  }, 60_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();

    // Seed minimum required data for a booking
    const company = await fx.prisma.busCompany.create({
      data: { name: 'TestCo', hotline: '19001', status: 'active' },
    });
    const fromStation = await fx.prisma.station.create({
      data: { name: 'HCM', address: 'Addr', lat: 10.0, lng: 106.0, city: 'HCM' },
    });
    const toStation = await fx.prisma.station.create({
      data: { name: 'HN', address: 'Addr', lat: 21.0, lng: 105.0, city: 'HN' },
    });
    const route = await fx.prisma.route.create({
      data: {
        companyId: company.id,
        fromStationId: fromStation.id,
        toStationId: toStation.id,
        distanceKm: 1700,
        durationMinutes: 960,
      },
    });
    const layout = await fx.prisma.seatLayout.create({
      data: { name: 'Test Layout', rows: 5, cols: 4 },
    });
    const vehicle = await fx.prisma.vehicle.create({
      data: {
        companyId: company.id,
        plateNumber: 'TEST-001',
        type: 'bus',
        seatLayoutId: layout.id,
        totalSeats: 20,
      },
    });
    const trip = await fx.prisma.trip.create({
      data: {
        routeId: route.id,
        vehicleId: vehicle.id,
        departureTime: new Date('2026-06-01T08:00:00Z'),
        arrivalTime: new Date('2026-06-01T16:00:00Z'),
        basePrice: 200_000,
        status: 'scheduled',
      },
    });
    tripId = trip.id;

    const seat1 = await fx.prisma.seat.create({
      data: { layoutId: layout.id, code: 'A1', floor: 1, row: 1, col: 1 },
    });
    const seat2 = await fx.prisma.seat.create({
      data: { layoutId: layout.id, code: 'A2', floor: 1, row: 1, col: 2 },
    });
    seatId1 = seat1.id;
    seatId2 = seat2.id;
  });

  const baseInput = () => ({
    bookingCode: 'ABCDEFGH',
    userId: null as number | null,
    tripId,
    totalAmount: 200_000,
    couponId: null as number | null,
    seats: [{ seatId: seatId1, price: 200_000 }],
    passengers: [
      {
        fullName: 'Alice',
        phone: '0901234567',
        idCardEncrypted: 'iv:tag:cipher',
      },
    ],
  });

  it('creates a booking with seats and passengers atomically', async () => {
    const booking = await repo.create(baseInput());

    expect(booking.id).toBeGreaterThan(0);
    expect(booking.bookingCode).toBe('ABCDEFGH');
    expect(booking.status).toBe('pending');
    expect(booking.seats).toHaveLength(1);
    expect(booking.seats[0]?.seatId).toBe(seatId1);
    expect(booking.passengers).toHaveLength(1);
    expect(booking.passengers[0]?.fullName).toBe('Alice');
  });

  it('findById returns booking with details', async () => {
    const created = await repo.create(baseInput());
    const found = await repo.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.bookingCode).toBe('ABCDEFGH');
    expect(found?.seats).toHaveLength(1);
    expect(found?.passengers).toHaveLength(1);
  });

  it('findById returns null for non-existent id', async () => {
    const found = await repo.findById(99999);
    expect(found).toBeNull();
  });

  it('findByCode returns booking by unique code', async () => {
    await repo.create(baseInput());
    const found = await repo.findByCode('ABCDEFGH');
    expect(found).not.toBeNull();
  });

  it('findByCodeAndPhone returns booking when both match', async () => {
    await repo.create(baseInput());
    const found = await repo.findByCodeAndPhone('ABCDEFGH', '0901234567');
    expect(found).not.toBeNull();
  });

  it('findByCodeAndPhone returns null when phone does not match', async () => {
    await repo.create(baseInput());
    const found = await repo.findByCodeAndPhone('ABCDEFGH', '0000000000');
    expect(found).toBeNull();
  });

  it('listByUser returns all bookings for a user', async () => {
    const user = await fx.prisma.user.create({
      data: {
        name: 'TestUser',
        phone: '0911111111',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'customer',
      },
    });

    await repo.create({ ...baseInput(), userId: user.id, bookingCode: 'CODE0001' });
    await repo.create({ ...baseInput(), userId: user.id, bookingCode: 'CODE0002' });

    const list = await repo.listByUser(user.id);
    expect(list).toHaveLength(2);
  });

  it('setStatus updates booking status', async () => {
    const booking = await repo.create(baseInput());
    await repo.setStatus(booking.id, 'confirmed');

    const updated = await repo.findById(booking.id);
    expect(updated?.status).toBe('confirmed');
  });

  it('findPendingOlderThan returns bookings created before cutoff', async () => {
    await repo.create(baseInput());

    // Backdate the booking in DB
    await fx.prisma.booking.updateMany({
      where: { bookingCode: 'ABCDEFGH' },
      data: { createdAt: new Date('2020-01-01') },
    });

    const cutoff = new Date('2025-01-01');
    const found = await repo.findPendingOlderThan(cutoff);
    expect(found).toHaveLength(1);
  });

  it('creates booking with multiple seats and passengers', async () => {
    const multi = {
      ...baseInput(),
      bookingCode: 'MULTI123',
      seats: [
        { seatId: seatId1, price: 200_000 },
        { seatId: seatId2, price: 200_000 },
      ],
      passengers: [
        { fullName: 'Alice', phone: '0901234567', idCardEncrypted: 'enc1' },
        { fullName: 'Bob', phone: '0907654321', idCardEncrypted: 'enc2' },
      ],
    };
    const booking = await repo.create(multi);
    expect(booking.seats).toHaveLength(2);
    expect(booking.passengers).toHaveLength(2);
  });
});
