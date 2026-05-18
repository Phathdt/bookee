import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { json, raw } from 'express';
import Stripe from 'stripe';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { RedisFixture, startRedisFixture } from '../../../test/redis-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';
import { IRedisClient } from '../../modules/redis/redis.client';
import { MomoProvider } from '../../modules/payments/infrastructure/providers/momo.provider';

const JWT_SECRET = 'payments-integration-secret';
const ENCRYPTION_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOMO_SECRET = 'test-momo-secret-32-chars-padded!!';
const STRIPE_WEBHOOK_SECRET = 'whsec_test_integration_secret';

describe('PaymentsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let redisFx: RedisFixture;
  let app: INestApplication;
  let baseUrl: string;
  let customerToken: string;
  let adminToken: string;
  let customerId: number;
  let tripId: number;
  let seatId1: number;
  let seatId2: number;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    redisFx = await startRedisFixture();

    process.env.DATABASE_URL = fx.connectionString;
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
    process.env.REDIS_URL = redisFx.connectionString;
    process.env.MOMO_SECRET_KEY = MOMO_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_API_KEY = 'sk_test_DEFER';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue(fx.databaseService)
      .overrideProvider(IRedisClient)
      .useValue(redisFx.client)
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: false });

    // Mirror main.ts body parser setup:
    // Stripe webhook route must receive the raw Buffer for signature verification.
    app.use('/api/v1/payments/webhooks/stripe', raw({ type: '*/*' }));
    app.use(json());

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

    // Seed users
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

    const admin = await fx.prisma.user.create({
      data: {
        name: 'Admin',
        phone: '0909999999',
        email: 'admin@test.com',
        passwordHash: 'hash',
        role: 'admin',
      },
    });

    const jwtSvc = new JwtService({ secret: JWT_SECRET });
    customerToken = jwtSvc.sign({
      sub: customerId,
      role: 'customer',
      operatorId: null,
      typ: 'access',
    });
    adminToken = jwtSvc.sign({ sub: admin.id, role: 'admin', operatorId: null, typ: 'access' });

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
        plateNumber: 'PAY-001',
        type: 'bus',
        seatLayoutId: layout.id,
        totalSeats: 20,
      },
    });
    const trip = await fx.prisma.trip.create({
      data: {
        routeId: route.id,
        vehicleId: vehicle.id,
        departureTime: new Date('2026-08-01T08:00:00Z'),
        arrivalTime: new Date('2026-08-01T16:00:00Z'),
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function createBooking(seatId: number): Promise<{ id: number; bookingCode: string }> {
    const res = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        tripId,
        seatIds: [seatId],
        passengers: [{ fullName: 'Alice', phone: '0901111111', idCard: '111111111111' }],
      }),
    });
    return res.json() as Promise<{ id: number; bookingCode: string }>;
  }

  async function createPayment(bookingId: number, provider: 'momo' | 'stripe' = 'momo') {
    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        bookingId,
        provider,
        returnUrl: 'http://localhost:5174/payment/return',
      }),
    });
    return { res, body: (await res.json()) as Record<string, unknown> };
  }

  function buildMomoWebhookBody(
    orderId: string,
    amount: number,
    resultCode: number,
  ): { body: string; signature: string } {
    const provider = new MomoProvider({
      partnerCode: 'MOMO_TEST',
      accessKey: 'MOMO_TEST_ACCESS',
      secretKey: MOMO_SECRET,
      apiBase: 'https://test-payment.momo.vn',
      returnUrl: 'http://localhost:5174/payment/return',
      notifyUrl: 'http://localhost:3000/api/v1/payments/webhooks/momo',
    });
    const params: Record<string, string> = {
      orderId,
      amount: String(amount),
      resultCode: String(resultCode),
    };
    const signature = provider.buildSignature(params);
    return { body: JSON.stringify({ ...params, signature }), signature };
  }

  function buildStripeWebhookPayload(
    transactionId: string,
    amount: number,
    bookingCode: string,
  ): { payload: string; sig: string } {
    const stripe = new Stripe('sk_test_DEFER');
    const payload = JSON.stringify({
      id: `evt_${transactionId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: transactionId,
          amount,
          metadata: { bookingCode },
        },
      },
    });
    const sig = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET,
    });
    return { payload, sig };
  }

  // ── POST /payments ─────────────────────────────────────────────────────────

  it('POST /payments creates a pending payment and returns paymentUrl', async () => {
    const booking = await createBooking(seatId1);
    const { res, body } = await createPayment(booking.id);

    expect(res.status).toBe(201);
    expect(body.status).toBe('pending');
    expect(body.bookingId).toBe(booking.id);
    expect(typeof body.paymentUrl).toBe('string');
    expect(body.transactionId).toMatch(/^momo-/);
  });

  it('POST /payments returns 409 when booking is not pending', async () => {
    const booking = await createBooking(seatId1);

    // First payment initiates fine
    await createPayment(booking.id);

    // Force-expire the booking
    await fx.prisma.booking.update({ where: { id: booking.id }, data: { status: 'expired' } });

    const { res } = await createPayment(booking.id);
    expect(res.status).toBe(409);
  });

  // ── POST /payments/webhooks/momo ───────────────────────────────────────────

  it('Momo webhook with valid signature → booking paid + tickets issued', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const transactionId = paymentBody.transactionId as string;

    const { body: whBody } = buildMomoWebhookBody(transactionId, 200_000, 0);

    const res = await fetch(`${baseUrl}/payments/webhooks/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: whBody,
    });

    expect(res.status).toBe(200);

    // Verify DB state
    const dbBooking = await fx.prisma.booking.findUnique({ where: { id: booking.id } });
    expect(dbBooking!.status).toBe('paid');

    const dbPayment = await fx.prisma.payment.findFirst({ where: { bookingId: booking.id } });
    expect(dbPayment!.status).toBe('succeeded');

    const tickets = await fx.prisma.ticket.findMany({
      where: {
        bookingSeatId: {
          in: (await fx.prisma.bookingSeat.findMany({ where: { bookingId: booking.id } })).map(
            (s) => s.id,
          ),
        },
      },
    });
    expect(tickets.length).toBeGreaterThanOrEqual(1);
    expect(tickets[0]!.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it('Momo webhook with invalid signature returns 400', async () => {
    const booking = await createBooking(seatId1);
    await createPayment(booking.id);

    const badBody = JSON.stringify({
      orderId: 'momo-BOOK0001-111',
      amount: '200000',
      resultCode: '0',
      signature: 'invalidsignature',
    });

    const res = await fetch(`${baseUrl}/payments/webhooks/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: badBody,
    });

    expect(res.status).toBe(400);
  });

  it('Momo webhook is idempotent — second valid hit returns 200 and does not double-issue tickets', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const transactionId = paymentBody.transactionId as string;

    const { body: whBody } = buildMomoWebhookBody(transactionId, 200_000, 0);

    // First webhook
    const res1 = await fetch(`${baseUrl}/payments/webhooks/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: whBody,
    });
    expect(res1.status).toBe(200);

    const ticketsBefore = await fx.prisma.ticket.findMany({
      where: {
        bookingSeatId: {
          in: (await fx.prisma.bookingSeat.findMany({ where: { bookingId: booking.id } })).map(
            (s) => s.id,
          ),
        },
      },
    });

    // Second webhook — idempotent
    const res2 = await fetch(`${baseUrl}/payments/webhooks/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: whBody,
    });
    expect(res2.status).toBe(200);

    const ticketsAfter = await fx.prisma.ticket.findMany({
      where: {
        bookingSeatId: {
          in: (await fx.prisma.bookingSeat.findMany({ where: { bookingId: booking.id } })).map(
            (s) => s.id,
          ),
        },
      },
    });
    // No extra tickets issued
    expect(ticketsAfter.length).toBe(ticketsBefore.length);
  });

  it('Momo webhook with amount mismatch returns 400 and payment stays pending', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const transactionId = paymentBody.transactionId as string;

    // Send wrong amount
    const { body: whBody } = buildMomoWebhookBody(transactionId, 1, 0);

    const res = await fetch(`${baseUrl}/payments/webhooks/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: whBody,
    });

    expect(res.status).toBe(400);

    const dbPayment = await fx.prisma.payment.findFirst({ where: { bookingId: booking.id } });
    expect(dbPayment!.status).toBe('pending');
  });

  // ── POST /payments/webhooks/stripe ─────────────────────────────────────────

  it('Stripe webhook with valid signature → booking paid + tickets issued', async () => {
    const booking = await createBooking(seatId2);
    const { body: paymentBody } = await createPayment(booking.id, 'stripe');
    const transactionId = paymentBody.transactionId as string;

    const { payload, sig } = buildStripeWebhookPayload(transactionId, 200_000, booking.bookingCode);

    const res = await fetch(`${baseUrl}/payments/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sig,
      },
      body: payload,
    });

    expect(res.status).toBe(200);

    const dbBooking = await fx.prisma.booking.findUnique({ where: { id: booking.id } });
    expect(dbBooking!.status).toBe('paid');

    const tickets = await fx.prisma.ticket.findMany({
      where: {
        bookingSeatId: {
          in: (await fx.prisma.bookingSeat.findMany({ where: { bookingId: booking.id } })).map(
            (s) => s.id,
          ),
        },
      },
    });
    expect(tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('Stripe webhook with invalid signature returns 400', async () => {
    const booking = await createBooking(seatId2);
    await createPayment(booking.id, 'stripe');

    const payload = JSON.stringify({
      id: 'evt_fake',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_fake', amount: 200_000, metadata: {} } },
    });

    const res = await fetch(`${baseUrl}/payments/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1,v1=badsignature',
      },
      body: payload,
    });

    expect(res.status).toBe(400);
  });

  // ── POST /payments/:id/confirm (admin) ─────────────────────────────────────

  it('admin manual confirm → booking paid + tickets issued', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const paymentId = paymentBody.id as number;

    const res = await fetch(`${baseUrl}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ transactionId: 'manual-confirm-001' }),
    });

    expect(res.status).toBe(200);

    const dbBooking = await fx.prisma.booking.findUnique({ where: { id: booking.id } });
    expect(dbBooking!.status).toBe('paid');

    const dbPayment = await fx.prisma.payment.findUnique({ where: { id: paymentId } });
    expect(dbPayment!.status).toBe('succeeded');

    const tickets = await fx.prisma.ticket.findMany({
      where: {
        bookingSeatId: {
          in: (await fx.prisma.bookingSeat.findMany({ where: { bookingId: booking.id } })).map(
            (s) => s.id,
          ),
        },
      },
    });
    expect(tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('manual confirm returns 403 when caller is not admin', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const paymentId = paymentBody.id as number;

    const res = await fetch(`${baseUrl}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ transactionId: 'manual-001' }),
    });

    // RolesGuard rejects non-admin → 403
    expect(res.status).toBe(403);
  });

  // ── GET /payments/:id ──────────────────────────────────────────────────────

  it('GET /payments/:id returns payment for authenticated user', async () => {
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const paymentId = paymentBody.id as number;

    const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe(paymentId);
    expect(body.status).toBe('pending');
  });

  // ── availableSeats reflects paid bookings ──────────────────────────────────

  it('trip search availableSeats decrements after a booking is paid', async () => {
    // First get the initial available seats from a trip search
    const company = await fx.prisma.busCompany.findFirst();
    const fromCity = 'HCM';
    const toCity = 'HN';

    const searchRes1 = await fetch(
      `${baseUrl}/trips/search?from=${fromCity}&to=${toCity}&date=2026-08-01`,
    );
    const page1 = (await searchRes1.json()) as { items: { availableSeats: number }[] };
    const initialSeats = page1.items[0]?.availableSeats ?? 0;

    // Book + pay a seat
    const booking = await createBooking(seatId1);
    const { body: paymentBody } = await createPayment(booking.id);
    const paymentId = paymentBody.id as number;

    await fetch(`${baseUrl}/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ transactionId: 'avail-test-001' }),
    });

    // After payment the seat lock is released AND booking is paid
    const searchRes2 = await fetch(
      `${baseUrl}/trips/search?from=${fromCity}&to=${toCity}&date=2026-08-01`,
    );
    const page2 = (await searchRes2.json()) as { items: { availableSeats: number }[] };
    const seatsAfterPay = page2.items[0]?.availableSeats ?? 0;

    // availableSeats should be 1 less (paid seat is subtracted)
    expect(seatsAfterPay).toBe(initialSeats - 1);
    void company; // suppress unused var warning
  });
});
