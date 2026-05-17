import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('StationsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let customerToken: string;
  const JWT_SECRET = 'stations-integration-secret';

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

  // ---- Public read --------------------------------------------------------

  it('GET /stations is public and returns empty by default', async () => {
    const res = await http('GET', '/stations');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /stations filters by city (case-insensitive)', async () => {
    await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'A', address: 'x', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'B', address: 'y', lat: 11, lng: 108, city: 'Lâm Đồng' },
    });
    const r = await http('GET', '/stations?city=TP.HCM');
    expect((r.body as { name: string }[]).map((s) => s.name)).toEqual(['A']);
  });

  it('GET /stations?q=da-lat finds "Đà Lạt" (diacritic-insensitive)', async () => {
    await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'Bến xe Đà Lạt', address: 'x', lat: 11.9, lng: 108.4, city: 'Lâm Đồng' },
    });
    const r = await http('GET', '/stations?q=da%20lat');
    expect((r.body as { name: string }[])[0]?.name).toBe('Bến xe Đà Lạt');
  });

  // ---- Admin write --------------------------------------------------------

  it('POST /stations creates one (admin)', async () => {
    const r = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'X', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ name: 'X', city: 'TP.HCM' });
  });

  it('POST /stations rejects customer with 403', async () => {
    const r = await http('POST', '/stations', {
      token: customerToken,
      body: { name: 'X', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    expect(r.status).toBe(403);
  });

  it('POST /stations rejects no bearer with 401', async () => {
    const r = await http('POST', '/stations', {
      body: { name: 'X', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    expect(r.status).toBe(401);
  });

  it('POST /stations rejects out-of-range lat with 400 (Zod)', async () => {
    const r = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'X', address: 'a', lat: 200, lng: 0, city: 'X' },
    });
    expect(r.status).toBe(400);
  });

  it('PATCH /stations/:id updates address', async () => {
    const c = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'X', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    const id = (c.body as { id: number }).id;
    const r = await http('PATCH', `/stations/${id}`, {
      token: adminToken,
      body: { address: 'updated' },
    });
    expect(r.status).toBe(200);
    expect((r.body as { address: string }).address).toBe('updated');
  });

  it('PATCH /stations/:id returns 404 when missing', async () => {
    const r = await http('PATCH', '/stations/99999', {
      token: adminToken,
      body: { address: 'x' },
    });
    expect(r.status).toBe(404);
  });

  it('GET /stations/:id returns 404 when missing', async () => {
    const r = await http('GET', '/stations/99999');
    expect(r.status).toBe(404);
  });

  it('DELETE /stations/:id deletes when no routes reference it', async () => {
    const c = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'X', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    const id = (c.body as { id: number }).id;
    const del = await http('DELETE', `/stations/${id}`, { token: adminToken });
    expect(del.status).toBe(204);
  });

  it('DELETE /stations/:id returns 404 when missing', async () => {
    const r = await http('DELETE', '/stations/99999', { token: adminToken });
    expect(r.status).toBe(404);
  });

  it('DELETE /stations/:id returns 409 when routes reference it', async () => {
    // Create an operator + 2 stations + route that references one.
    const op = await fx.prisma.busCompany.create({
      data: { name: 'OpForRoute', hotline: '19009000', status: 'active' },
    });
    const a = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'A', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    const b = await http('POST', '/stations', {
      token: adminToken,
      body: { name: 'B', address: 'b', lat: 11, lng: 108, city: 'Lâm Đồng' },
    });
    const fromId = (a.body as { id: number }).id;
    const toId = (b.body as { id: number }).id;
    await fx.prisma.route.create({
      data: {
        companyId: op.id,
        fromStationId: fromId,
        toStationId: toId,
        distanceKm: 300,
        durationMinutes: 360,
      },
    });

    const del = await http('DELETE', `/stations/${fromId}`, { token: adminToken });
    expect(del.status).toBe(409);
  });
});
