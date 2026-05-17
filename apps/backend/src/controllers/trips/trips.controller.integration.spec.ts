import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('TripsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let op1Token: string;
  let op2Token: string;
  let customerToken: string;
  let op1Id: number;
  let op2Id: number;
  let routeId: number;
  let route2Id: number;
  let vehicleId: number;
  let vehicle2Id: number;
  const JWT_SECRET = 'trips-integration-secret';

  beforeAll(async () => {
    fx = await startPostgresFixture();
    process.env.DATABASE_URL = fx.connectionString;
    process.env.JWT_SECRET = JWT_SECRET;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue(fx.databaseService)
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
  });

  beforeEach(async () => {
    await fx.resetDatabase();

    const op1 = await fx.prisma.busCompany.create({
      data: { name: 'Op1', hotline: '19001', status: 'active' },
    });
    const op2 = await fx.prisma.busCompany.create({
      data: { name: 'Op2', hotline: '19002', status: 'active' },
    });
    op1Id = op1.id;
    op2Id = op2.id;

    const fromStation = await fx.prisma.station.create({
      data: { name: 'HCM', address: 'Addr HCM', lat: 10.8, lng: 106.7, city: 'HCM' },
    });
    const toStation = await fx.prisma.station.create({
      data: { name: 'HN', address: 'Addr HN', lat: 21.0, lng: 105.8, city: 'HN' },
    });
    const route = await fx.prisma.route.create({
      data: {
        companyId: op1Id,
        fromStationId: fromStation.id,
        toStationId: toStation.id,
        distanceKm: 1700,
        durationMinutes: 960,
      },
    });
    routeId = route.id;

    const fromStation2 = await fx.prisma.station.create({
      data: { name: 'DN', address: 'Addr DN', lat: 16.1, lng: 108.2, city: 'DN' },
    });
    const toStation2 = await fx.prisma.station.create({
      data: { name: 'HP', address: 'Addr HP', lat: 20.9, lng: 106.7, city: 'HP' },
    });
    const route2 = await fx.prisma.route.create({
      data: {
        companyId: op2Id,
        fromStationId: fromStation2.id,
        toStationId: toStation2.id,
        distanceKm: 800,
        durationMinutes: 480,
      },
    });
    route2Id = route2.id;

    const layout = await fx.prisma.seatLayout.create({
      data: { name: 'Standard', rows: 5, cols: 4 },
    });
    const vehicle = await fx.prisma.vehicle.create({
      data: {
        companyId: op1Id,
        plateNumber: '51A-00001',
        type: 'sleeper',
        seatLayoutId: layout.id,
        totalSeats: 40,
      },
    });
    vehicleId = vehicle.id;

    const layout2 = await fx.prisma.seatLayout.create({
      data: { name: 'Standard2', rows: 4, cols: 4 },
    });
    const vehicle2 = await fx.prisma.vehicle.create({
      data: {
        companyId: op2Id,
        plateNumber: '51B-00002',
        type: 'seater',
        seatLayoutId: layout2.id,
        totalSeats: 30,
      },
    });
    vehicle2Id = vehicle2.id;

    const admin = await fx.prisma.user.create({
      data: {
        name: 'Admin',
        phone: '0900000001',
        email: 'admin@bookee.test',
        passwordHash: 'h',
        role: 'admin',
      },
    });
    const op1Staff = await fx.prisma.user.create({
      data: {
        name: 'Op1Staff',
        phone: '0900000002',
        email: 'op1@bookee.test',
        passwordHash: 'h',
        role: 'operator',
        operatorId: op1Id,
      },
    });
    const op2Staff = await fx.prisma.user.create({
      data: {
        name: 'Op2Staff',
        phone: '0900000003',
        email: 'op2@bookee.test',
        passwordHash: 'h',
        role: 'operator',
        operatorId: op2Id,
      },
    });

    const jwt = new JwtService({ secret: JWT_SECRET });
    adminToken = await jwt.signAsync(
      { sub: admin.id, role: 'admin', operatorId: null, typ: 'access' },
      { expiresIn: '1h' },
    );
    op1Token = await jwt.signAsync(
      { sub: op1Staff.id, role: 'operator', operatorId: op1Id, typ: 'access' },
      { expiresIn: '1h' },
    );
    op2Token = await jwt.signAsync(
      { sub: op2Staff.id, role: 'operator', operatorId: op2Id, typ: 'access' },
      { expiresIn: '1h' },
    );

    const reg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cust',
        phone: '0900000004',
        email: 'cust@bookee.test',
        password: 'sup3rsecure',
      }),
    });
    customerToken = ((await reg.json()) as { tokens: { accessToken: string } }).tokens.accessToken;
  });

  async function http(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    init: { token?: string; body?: unknown } = {},
  ): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  function newTripBody(
    overrides: Partial<{
      routeId: number;
      vehicleId: number;
      departureTime: string;
      arrivalTime: string;
    }> = {},
  ) {
    return {
      routeId: overrides.routeId ?? routeId,
      vehicleId: overrides.vehicleId ?? vehicleId,
      departureTime: overrides.departureTime ?? '2030-06-01T08:00:00.000Z',
      arrivalTime: overrides.arrivalTime ?? '2030-06-01T10:00:00.000Z',
      basePrice: 50_000,
    };
  }

  // ---- Public read --------------------------------------------------------

  it('GET /trips is public and returns empty by default', async () => {
    const res = await http('GET', '/trips');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /trips/:id returns 404 when missing', async () => {
    const res = await http('GET', '/trips/99999');
    expect(res.status).toBe(404);
  });

  it('GET /trips filters by vehicleId', async () => {
    await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const res = await http('GET', `/trips?vehicleId=${vehicleId}`);
    expect(res.status).toBe(200);
    expect((res.body as { vehicleId: number }[]).every((t) => t.vehicleId === vehicleId)).toBe(
      true,
    );
  });

  it('GET /trips filters by status', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'cancelled' },
    });
    const scheduled = await http('GET', '/trips?status=scheduled');
    expect((scheduled.body as unknown[]).length).toBe(0);
    const cancelled = await http('GET', '/trips?status=cancelled');
    expect((cancelled.body as unknown[]).length).toBe(1);
  });

  it('GET /trips/:id returns the trip', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('GET', `/trips/${id}`);
    expect(res.status).toBe(200);
    expect((res.body as { id: number }).id).toBe(id);
  });

  // ---- POST /trips --------------------------------------------------------

  it('POST /trips creates a trip (admin)', async () => {
    const res = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    expect(res.status).toBe(201);
    expect((res.body as { status: string }).status).toBe('scheduled');
  });

  it('POST /trips rejects no bearer with 401', async () => {
    const res = await http('POST', '/trips', { body: newTripBody() });
    expect(res.status).toBe(401);
  });

  it('POST /trips rejects customer with 403', async () => {
    const res = await http('POST', '/trips', { token: customerToken, body: newTripBody() });
    expect(res.status).toBe(403);
  });

  it('POST /trips accepts matching operator (op1)', async () => {
    const res = await http('POST', '/trips', { token: op1Token, body: newTripBody() });
    expect(res.status).toBe(201);
  });

  it('POST /trips rejects op2 accessing op1 resources with 403', async () => {
    const res = await http('POST', '/trips', { token: op2Token, body: newTripBody() });
    expect(res.status).toBe(403);
  });

  it('POST /trips rejects cross-operator route+vehicle with 400', async () => {
    const res = await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({ routeId, vehicleId: vehicle2Id }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /trips rejects departure >= arrival with 400', async () => {
    const res = await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({
        departureTime: '2030-06-01T10:00:00.000Z',
        arrivalTime: '2030-06-01T08:00:00.000Z',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /trips rejects overlapping vehicle schedule with 409', async () => {
    await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const res = await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({
        departureTime: '2030-06-01T09:00:00.000Z',
        arrivalTime: '2030-06-01T11:00:00.000Z',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('POST /trips allows touching endpoints (no conflict)', async () => {
    await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const res = await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({
        departureTime: '2030-06-01T10:00:00.000Z',
        arrivalTime: '2030-06-01T12:00:00.000Z',
      }),
    });
    expect(res.status).toBe(201);
  });

  // ---- POST /trips/bulk ---------------------------------------------------

  it('POST /trips/bulk creates one trip per day (admin)', async () => {
    const res = await http('POST', '/trips/bulk', {
      token: adminToken,
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-05' },
        dailyDepartureTime: '08:00',
        tripDurationMinutes: 120,
      },
    });
    expect(res.status).toBe(201);
    expect((res.body as unknown[]).length).toBe(5);
  });

  it('POST /trips/bulk rejects no bearer with 401', async () => {
    const res = await http('POST', '/trips/bulk', {
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-03' },
        dailyDepartureTime: '08:00',
        tripDurationMinutes: 120,
      },
    });
    expect(res.status).toBe(401);
  });

  it('POST /trips/bulk rejects invalid dailyDepartureTime format with 400 or 422', async () => {
    const res = await http('POST', '/trips/bulk', {
      token: adminToken,
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-03' },
        dailyDepartureTime: '8:00',
        tripDurationMinutes: 120,
      },
    });
    // nestjs-zod ZodValidationPipe returns 422 Unprocessable Entity
    expect([400, 422]).toContain(res.status);
  });

  it('POST /trips/bulk returns 409 when conflict exists with existing trip', async () => {
    await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({
        departureTime: '2030-09-02T07:00:00.000Z',
        arrivalTime: '2030-09-02T09:00:00.000Z',
      }),
    });
    const res = await http('POST', '/trips/bulk', {
      token: adminToken,
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-03' },
        dailyDepartureTime: '08:00',
        tripDurationMinutes: 120,
      },
    });
    expect(res.status).toBe(409);
  });

  it('POST /trips/bulk is atomic — no trips persisted on conflict', async () => {
    await http('POST', '/trips', {
      token: adminToken,
      body: newTripBody({
        departureTime: '2030-09-02T07:00:00.000Z',
        arrivalTime: '2030-09-02T09:00:00.000Z',
      }),
    });
    const before = (await http('GET', '/trips')).body as unknown[];
    await http('POST', '/trips/bulk', {
      token: adminToken,
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-03' },
        dailyDepartureTime: '08:00',
        tripDurationMinutes: 120,
      },
    });
    const after = (await http('GET', '/trips')).body as unknown[];
    expect(after.length).toBe(before.length);
  });

  it('POST /trips/bulk rejects op2 accessing op1 resources with 403', async () => {
    const res = await http('POST', '/trips/bulk', {
      token: op2Token,
      body: {
        routeId,
        vehicleId,
        basePrice: 50_000,
        dateRange: { start: '2030-09-01', end: '2030-09-03' },
        dailyDepartureTime: '08:00',
        tripDurationMinutes: 120,
      },
    });
    expect(res.status).toBe(403);
  });

  // ---- PATCH /trips/:id/status --------------------------------------------

  it('PATCH /trips/:id/status transitions scheduled → in_progress', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'in_progress' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('in_progress');
  });

  it('PATCH /trips/:id/status transitions scheduled → cancelled', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'cancelled' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('cancelled');
  });

  it('PATCH /trips/:id/status rejects invalid transition with 409', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'completed' },
    });
    expect(res.status).toBe(409);
  });

  it('PATCH /trips/:id/status returns 404 for missing trip', async () => {
    const res = await http('PATCH', '/trips/99999/status', {
      token: adminToken,
      body: { status: 'in_progress' },
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /trips/:id/status rejects no bearer with 401', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      body: { status: 'in_progress' },
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /trips/:id/status rejects customer with 403', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      token: customerToken,
      body: { status: 'in_progress' },
    });
    expect(res.status).toBe(403);
  });

  it('PATCH /trips/:id/status rejects op2 modifying op1 trip with 403', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/trips/${id}/status`, {
      token: op2Token,
      body: { status: 'in_progress' },
    });
    expect(res.status).toBe(403);
  });

  it('PATCH /trips/:id/status full lifecycle: scheduled→in_progress→completed', async () => {
    const created = await http('POST', '/trips', { token: adminToken, body: newTripBody() });
    const id = (created.body as { id: number }).id;

    const r1 = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'in_progress' },
    });
    expect(r1.status).toBe(200);

    const r2 = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'completed' },
    });
    expect(r2.status).toBe(200);
    expect((r2.body as { status: string }).status).toBe('completed');

    // completed is terminal
    const r3 = await http('PATCH', `/trips/${id}/status`, {
      token: adminToken,
      body: { status: 'cancelled' },
    });
    expect(r3.status).toBe(409);
  });
});
