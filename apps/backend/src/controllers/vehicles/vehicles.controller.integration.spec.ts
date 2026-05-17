import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startPostgresFixture, PostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('VehiclesController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let op1Token: string;
  let op2Token: string;
  let customerToken: string;
  let op1Id: number;
  let op2Id: number;
  let layoutId: number;
  const JWT_SECRET = 'vehicles-integration-secret';

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
    await fx.prisma.vehicle.deleteMany({});
    await fx.prisma.seat.deleteMany({});
    await fx.prisma.seatLayout.deleteMany({});
    await fx.prisma.route.deleteMany({});
    await fx.prisma.station.deleteMany({});
    await fx.prisma.user.deleteMany({});
    await fx.prisma.busCompany.deleteMany({});

    const op1 = await fx.prisma.busCompany.create({
      data: { name: 'Op1', hotline: '19001', status: 'active' },
    });
    const op2 = await fx.prisma.busCompany.create({
      data: { name: 'Op2', hotline: '19002', status: 'active' },
    });
    op1Id = op1.id;
    op2Id = op2.id;

    // Create a seat layout with 2 seats for vehicle tests
    const layout = await fx.prisma.seatLayout.create({
      data: { name: 'Standard 2', rows: 1, cols: 2 },
    });
    await fx.prisma.seat.createMany({
      data: [
        { layoutId: layout.id, code: 'A1', floor: 1, row: 1, col: 1 },
        { layoutId: layout.id, code: 'A2', floor: 1, row: 1, col: 2 },
      ],
    });
    layoutId = layout.id;

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
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  function newVehicleBody(overrides: Partial<{ companyId: number; plateNumber: string }> = {}) {
    return {
      companyId: overrides.companyId ?? op1Id,
      plateNumber: overrides.plateNumber ?? '51A-12345',
      type: 'sleeper',
      seatLayoutId: layoutId,
      totalSeats: 2,
    };
  }

  // ---- Public read --------------------------------------------------------

  it('GET /vehicles is public and returns empty by default', async () => {
    const res = await http('GET', '/vehicles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /vehicles filters by companyId', async () => {
    await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ companyId: op1Id, plateNumber: '51A-00001' }),
    });
    await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ companyId: op2Id, plateNumber: '51A-00002' }),
    });
    const res = await http('GET', `/vehicles?companyId=${op1Id}`);
    expect((res.body as { companyId: number }[]).every((v) => v.companyId === op1Id)).toBe(true);
  });

  it('GET /vehicles/:id returns 404 when missing', async () => {
    const res = await http('GET', '/vehicles/99999');
    expect(res.status).toBe(404);
  });

  // ---- Operator / admin write ---------------------------------------------

  it('POST /vehicles creates one (admin)', async () => {
    const res = await http('POST', '/vehicles', { token: adminToken, body: newVehicleBody() });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ companyId: op1Id, plateNumber: '51A-12345', totalSeats: 2 });
  });

  it('POST /vehicles rejects no bearer with 401', async () => {
    const res = await http('POST', '/vehicles', { body: newVehicleBody() });
    expect(res.status).toBe(401);
  });

  it('POST /vehicles rejects customer with 403', async () => {
    const res = await http('POST', '/vehicles', { token: customerToken, body: newVehicleBody() });
    expect(res.status).toBe(403);
  });

  it('POST /vehicles accepts matching operator', async () => {
    const res = await http('POST', '/vehicles', {
      token: op1Token,
      body: newVehicleBody({ companyId: op1Id }),
    });
    expect(res.status).toBe(201);
  });

  it('POST /vehicles rejects operator creating vehicle for another operator with 403', async () => {
    const res = await http('POST', '/vehicles', {
      token: op1Token,
      body: newVehicleBody({ companyId: op2Id }),
    });
    expect(res.status).toBe(403);
  });

  it('POST /vehicles returns 409 on duplicate plate number', async () => {
    await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ plateNumber: '51A-99999' }),
    });
    const res = await http('POST', '/vehicles', {
      token: adminToken,
      body: { ...newVehicleBody({ plateNumber: '51A-99999' }), companyId: op2Id },
    });
    expect(res.status).toBe(409);
  });

  it('POST /vehicles returns 400 when totalSeats does not match layout seats', async () => {
    const res = await http('POST', '/vehicles', {
      token: adminToken,
      body: { ...newVehicleBody(), totalSeats: 99 },
    });
    expect(res.status).toBe(400);
  });

  it('PATCH /vehicles/:id updates type', async () => {
    const created = await http('POST', '/vehicles', { token: adminToken, body: newVehicleBody() });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/vehicles/${id}`, {
      token: adminToken,
      body: { type: 'limousine' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { type: string }).type).toBe('limousine');
  });

  it('PATCH /vehicles/:id returns 404 when missing', async () => {
    const res = await http('PATCH', '/vehicles/99999', {
      token: adminToken,
      body: { type: 'x' },
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /vehicles/:id rejects update from another operator with 403', async () => {
    const created = await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ companyId: op1Id }),
    });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/vehicles/${id}`, {
      token: op2Token,
      body: { type: 'limousine' },
    });
    expect(res.status).toBe(403);
  });

  it('PATCH /vehicles/:id returns 409 on duplicate plate number', async () => {
    const v1 = await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ plateNumber: '51A-11111' }),
    });
    await http('POST', '/vehicles', {
      token: adminToken,
      body: { ...newVehicleBody({ plateNumber: '51A-22222' }), companyId: op2Id },
    });
    const id = (v1.body as { id: number }).id;
    const res = await http('PATCH', `/vehicles/${id}`, {
      token: adminToken,
      body: { plateNumber: '51A-22222' },
    });
    expect(res.status).toBe(409);
  });

  it('DELETE /vehicles/:id deletes (admin)', async () => {
    const created = await http('POST', '/vehicles', { token: adminToken, body: newVehicleBody() });
    const id = (created.body as { id: number }).id;
    const del = await http('DELETE', `/vehicles/${id}`, { token: adminToken });
    expect(del.status).toBe(204);
    const after = await http('GET', `/vehicles/${id}`);
    expect(after.status).toBe(404);
  });

  it('DELETE /vehicles/:id rejects another operator with 403', async () => {
    const created = await http('POST', '/vehicles', {
      token: adminToken,
      body: newVehicleBody({ companyId: op1Id }),
    });
    const id = (created.body as { id: number }).id;
    const res = await http('DELETE', `/vehicles/${id}`, { token: op2Token });
    expect(res.status).toBe(403);
  });

  it('DELETE /vehicles/:id returns 404 when missing', async () => {
    const res = await http('DELETE', '/vehicles/99999', { token: adminToken });
    expect(res.status).toBe(404);
  });
});
