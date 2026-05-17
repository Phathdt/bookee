import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('SeatLayoutsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let customerToken: string;
  const JWT_SECRET = 'seat-layouts-integration-secret';

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

    const admin = await fx.prisma.user.create({
      data: {
        name: 'Admin',
        phone: '0900000001',
        email: 'admin@bookee.test',
        passwordHash: 'h',
        role: 'admin',
      },
    });
    const jwt = new JwtService({ secret: JWT_SECRET });
    adminToken = await jwt.signAsync(
      { sub: admin.id, role: 'admin', operatorId: null, typ: 'access' },
      { expiresIn: '1h' },
    );

    const reg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cust',
        phone: '0900000002',
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

  const validBody = {
    name: 'Standard 40',
    rows: 2,
    cols: 2,
    seats: [
      { code: 'A1', floor: 1, row: 1, col: 1 },
      { code: 'A2', floor: 1, row: 1, col: 2 },
      { code: 'B1', floor: 1, row: 2, col: 1 },
      { code: 'B2', floor: 1, row: 2, col: 2 },
    ],
  };

  // ---- Public read --------------------------------------------------------

  it('GET /seat-layouts is public and returns empty by default', async () => {
    const res = await http('GET', '/seat-layouts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /seat-layouts/:id returns full layout with seats', async () => {
    const created = await http('POST', '/seat-layouts', { token: adminToken, body: validBody });
    const id = (created.body as { id: number }).id;
    const res = await http('GET', `/seat-layouts/${id}`);
    expect(res.status).toBe(200);
    expect((res.body as { seats: unknown[] }).seats).toHaveLength(4);
  });

  it('GET /seat-layouts/:id returns 404 when missing', async () => {
    const res = await http('GET', '/seat-layouts/99999');
    expect(res.status).toBe(404);
  });

  // ---- Admin write --------------------------------------------------------

  it('POST /seat-layouts creates layout + seats atomically (admin)', async () => {
    const res = await http('POST', '/seat-layouts', { token: adminToken, body: validBody });
    expect(res.status).toBe(201);
    const body = res.body as { id: number; name: string; seats: unknown[] };
    expect(body.name).toBe('Standard 40');
    expect(body.seats).toHaveLength(4);
  });

  it('POST /seat-layouts rejects no bearer with 401', async () => {
    const res = await http('POST', '/seat-layouts', { body: validBody });
    expect(res.status).toBe(401);
  });

  it('POST /seat-layouts rejects customer with 403', async () => {
    const res = await http('POST', '/seat-layouts', { token: customerToken, body: validBody });
    expect(res.status).toBe(403);
  });

  it('POST /seat-layouts rejects rows <= 0 with 400 (Zod)', async () => {
    const res = await http('POST', '/seat-layouts', {
      token: adminToken,
      body: { ...validBody, rows: 0 },
    });
    expect(res.status).toBe(400);
  });

  it('POST /seat-layouts rejects duplicate seat codes with 400 (domain)', async () => {
    const res = await http('POST', '/seat-layouts', {
      token: adminToken,
      body: {
        name: 'X',
        rows: 2,
        cols: 2,
        seats: [
          { code: 'A1', floor: 1, row: 1, col: 1 },
          { code: 'A1', floor: 1, row: 1, col: 2 },
        ],
      },
    });
    expect(res.status).toBe(400);
  });

  it('POST /seat-layouts rejects seat out of grid bounds with 400 (domain)', async () => {
    const res = await http('POST', '/seat-layouts', {
      token: adminToken,
      body: {
        name: 'X',
        rows: 2,
        cols: 2,
        seats: [{ code: 'A1', floor: 1, row: 5, col: 1 }],
      },
    });
    expect(res.status).toBe(400);
  });

  it('PATCH /seat-layouts/:id updates name (admin)', async () => {
    const created = await http('POST', '/seat-layouts', { token: adminToken, body: validBody });
    const id = (created.body as { id: number }).id;
    const res = await http('PATCH', `/seat-layouts/${id}`, {
      token: adminToken,
      body: { name: 'Renamed' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { name: string }).name).toBe('Renamed');
  });

  it('PATCH /seat-layouts/:id returns 404 when missing', async () => {
    const res = await http('PATCH', '/seat-layouts/99999', {
      token: adminToken,
      body: { name: 'X' },
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /seat-layouts/:id deletes when no vehicles reference it', async () => {
    const created = await http('POST', '/seat-layouts', { token: adminToken, body: validBody });
    const id = (created.body as { id: number }).id;
    const del = await http('DELETE', `/seat-layouts/${id}`, { token: adminToken });
    expect(del.status).toBe(204);
  });

  it('DELETE /seat-layouts/:id returns 404 when missing', async () => {
    const res = await http('DELETE', '/seat-layouts/99999', { token: adminToken });
    expect(res.status).toBe(404);
  });

  it('DELETE /seat-layouts/:id returns 409 when a vehicle references it', async () => {
    const created = await http('POST', '/seat-layouts', { token: adminToken, body: validBody });
    const layoutId = (created.body as { id: number }).id;

    const op = await fx.prisma.busCompany.create({
      data: { name: 'Op', hotline: '19001', status: 'active' },
    });
    await fx.prisma.vehicle.create({
      data: {
        companyId: op.id,
        plateNumber: '51A-12345',
        type: 'sleeper',
        seatLayoutId: layoutId,
        totalSeats: 4,
      },
    });

    const del = await http('DELETE', `/seat-layouts/${layoutId}`, { token: adminToken });
    expect(del.status).toBe(409);
  });
});
