import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { RedisFixture, startRedisFixture } from '../../../test/redis-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';
import { IRedisClient } from '../../modules/redis/redis.client';

const JWT_SECRET = 'bookings-integration-secret';
const ENCRYPTION_KEY = 'd26d4634b275e24f4899622c8e12838afe6c0ce099ed8e348df5a07750551592';

describe('BookingsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let redisFx: RedisFixture;
  let app: INestApplication;
  let baseUrl: string;
  let customerToken: string;
  let customer2Token: string;
  let tripId: number;
  let seatId1: number;
  let seatId2: number;
  let seatId3: number;
  let customerId: number;
  let customer2Id: number;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    redisFx = await startRedisFixture();

    process.env.DATABASE_URL = fx.connectionString;
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
    process.env.REDIS_URL = redisFx.connectionString;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue(fx.databaseService)
      .overrideProvider(IRedisClient)
      .useValue(redisFx.client)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.listen(0);

    const { port } = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await fx.stop();
    await redisFx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
    await redisFx.flushAll();

    // Create customers
    const customer = await fx.prisma.user.create({
      data: {
        name: 'Alice',
        phone: '0901111111',
        email: 'alice@test.com',
        passwordHash: 'hash',
        role: 'customer',
      },
    });
    customerId = customer.id;

    const customer2 = await fx.prisma.user.create({
      data: {
        name: 'Bob',
        phone: '0902222222',
        email: 'bob@test.com',
        passwordHash: 'hash',
        role: 'customer',
      },
    });
    customer2Id = customer2.id;

    const jwtSvc = new JwtService({ secret: JWT_SECRET });
    customerToken = jwtSvc.sign({
      sub: customerId,
      role: 'customer',
      operatorId: null,
      typ: 'access',
    });
    customer2Token = jwtSvc.sign({
      sub: customer2Id,
      role: 'customer',
      operatorId: null,
      typ: 'access',
    });

    // Seed trip + seats
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
      data: { name: 'Layout', rows: 5, cols: 4 },
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
    const seat3 = await fx.prisma.seat.create({
      data: { layoutId: layout.id, code: 'A3', floor: 1, row: 1, col: 3 },
    });
    seatId1 = seat1.id;
    seatId2 = seat2.id;
    seatId3 = seat3.id;
  });

  // ── POST /bookings ────────────────────────────────────────────────────────

  it('guest can book without auth token', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Guest User', phone: '0900000001', idCard: '111111111111' }],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.bookingCode).toHaveLength(8);
    expect(body.userId).toBeNull();
    expect(body.status).toBe('pending');
  });

  it('authenticated user can book and booking appears in /me', async () => {
    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '222222222222' }],
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as Record<string, unknown>;
    expect(created.userId).toBe(customerId);

    const meRes = await fetch(`${baseUrl}/bookings/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(meRes.status).toBe(200);
    const bookings = (await meRes.json()) as unknown[];
    expect(bookings).toHaveLength(1);
  });

  it('duplicate seat booking returns 409 with conflictingSeatIds', async () => {
    // First booking takes seat 1
    const first = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '111111111111' }],
      }),
    });
    expect(first.status).toBe(201);

    // Second booking tries the same seat
    const second = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Bob', phone: '0902222222', idCard: '222222222222' }],
      }),
    });
    expect(second.status).toBe(409);
    const body = (await second.json()) as Record<string, unknown>;
    // NestJS ConflictException with an object arg spreads it into the response body.
    // Shape: { statusCode, message: { message, conflictingSeatIds } }
    const nested = body.message as Record<string, unknown>;
    const ids = (nested?.conflictingSeatIds ?? body.conflictingSeatIds) as number[] | undefined;
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toContain(seatId1);
  });

  it('cancel pending booking releases lock so seat is bookable again', async () => {
    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId2],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '333333333333' }],
      }),
    });
    expect(createRes.status).toBe(201);
    const booking = (await createRes.json()) as { id: number };

    // Cancel
    const cancelRes = await fetch(`${baseUrl}/bookings/${booking.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(cancelRes.status).toBe(200);

    // Seat should now be bookable
    const reBookRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId2],
        passengers: [{ fullName: 'Bob', phone: '0902222222', idCard: '444444444444' }],
      }),
    });
    expect(reBookRes.status).toBe(201);
  });

  it('lookup with valid code + phone returns booking', async () => {
    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId3],
        passengers: [{ fullName: 'Charlie', phone: '0903333333', idCard: '555555555555' }],
      }),
    });
    const booking = (await createRes.json()) as { bookingCode: string };

    const lookupRes = await fetch(
      `${baseUrl}/bookings/lookup?code=${booking.bookingCode}&phone=0903333333`,
    );
    expect(lookupRes.status).toBe(200);
    const found = (await lookupRes.json()) as { bookingCode: string };
    expect(found.bookingCode).toBe(booking.bookingCode);
  });

  it('lookup with wrong phone returns 404', async () => {
    const createRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Dave', phone: '0904444444', idCard: '666666666666' }],
      }),
    });
    const booking = (await createRes.json()) as { bookingCode: string };

    const lookupRes = await fetch(
      `${baseUrl}/bookings/lookup?code=${booking.bookingCode}&phone=0000000000`,
    );
    expect(lookupRes.status).toBe(404);
  });

  it('concurrent bookings on overlapping seats — exactly one wins with 201', async () => {
    const makeBooking = () =>
      fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          seatIds: [seatId1],
          passengers: [{ fullName: 'Racer', phone: '0900000099', idCard: '999999999999' }],
        }),
      });

    const [r1, r2] = await Promise.all([makeBooking(), makeBooking()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('idCard is masked in response (last 4 chars visible)', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '123456789012' }],
      }),
    });
    const body = (await res.json()) as { passengers: { idCardMasked: string }[] };
    expect(body.passengers[0]?.idCardMasked).toBe('***9012');
  });

  it('GET /bookings/me requires authentication', async () => {
    const res = await fetch(`${baseUrl}/bookings/me`);
    expect(res.status).toBe(401);
  });

  it('passenger count mismatch returns 400', async () => {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId1, seatId2],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '111111111111' }],
      }),
    });
    expect(res.status).toBe(400);
  });
});
