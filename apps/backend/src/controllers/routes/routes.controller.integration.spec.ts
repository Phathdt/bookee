import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('RoutesController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let op1Token: string;
  let op2Token: string;
  let customerToken: string;
  let op1Id: number;
  let op2Id: number;
  let stationAId: number;
  let stationBId: number;
  const JWT_SECRET = 'routes-integration-secret';

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

    const stationA = await fx.prisma.station.create({
      data: { name: 'A', address: 'a', lat: 10, lng: 106, city: 'TP.HCM' },
    });
    const stationB = await fx.prisma.station.create({
      data: { name: 'B', address: 'b', lat: 11.9, lng: 108.4, city: 'Lâm Đồng' },
    });
    stationAId = stationA.id;
    stationBId = stationB.id;

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

  function newRouteBody(overrides: Partial<{ companyId: number }> = {}): {
    companyId: number;
    fromStationId: number;
    toStationId: number;
    distanceKm: number;
    durationMinutes: number;
  } {
    return {
      companyId: overrides.companyId ?? op1Id,
      fromStationId: stationAId,
      toStationId: stationBId,
      distanceKm: 300,
      durationMinutes: 360,
    };
  }

  // ---- Public read --------------------------------------------------------

  it('GET /routes is public and returns empty by default', async () => {
    const r = await http('GET', '/routes');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([]);
  });

  it('GET /routes filters by companyId', async () => {
    await http('POST', '/routes', { token: adminToken, body: newRouteBody({ companyId: op1Id }) });
    await http('POST', '/routes', { token: adminToken, body: newRouteBody({ companyId: op2Id }) });
    const r = await http('GET', `/routes?companyId=${op1Id}`);
    expect((r.body as { companyId: number }[]).every((x) => x.companyId === op1Id)).toBe(true);
  });

  it('GET /routes/:id returns 404 when missing', async () => {
    const r = await http('GET', '/routes/99999');
    expect(r.status).toBe(404);
  });

  // ---- Admin write --------------------------------------------------------

  it('POST /routes creates one (admin)', async () => {
    const r = await http('POST', '/routes', { token: adminToken, body: newRouteBody() });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ companyId: op1Id, distanceKm: 300 });
  });

  it('POST /routes rejects no bearer with 401', async () => {
    const r = await http('POST', '/routes', { body: newRouteBody() });
    expect(r.status).toBe(401);
  });

  it('POST /routes rejects customer with 403', async () => {
    const r = await http('POST', '/routes', { token: customerToken, body: newRouteBody() });
    expect(r.status).toBe(403);
  });

  it('POST /routes accepts matching operator', async () => {
    const r = await http('POST', '/routes', {
      token: op1Token,
      body: newRouteBody({ companyId: op1Id }),
    });
    expect(r.status).toBe(201);
  });

  it('POST /routes rejects operator creating route for another operator with 403', async () => {
    const r = await http('POST', '/routes', {
      token: op1Token,
      body: newRouteBody({ companyId: op2Id }),
    });
    expect(r.status).toBe(403);
  });

  it('POST /routes rejects from==to with 400 (Zod or domain)', async () => {
    const r = await http('POST', '/routes', {
      token: adminToken,
      body: { ...newRouteBody(), toStationId: stationAId },
    });
    expect(r.status).toBe(400);
  });

  it('POST /routes rejects non-positive distanceKm with 400 (Zod)', async () => {
    const r = await http('POST', '/routes', {
      token: adminToken,
      body: { ...newRouteBody(), distanceKm: 0 },
    });
    expect(r.status).toBe(400);
  });

  it('PATCH /routes/:id updates distance + duration', async () => {
    const c = await http('POST', '/routes', { token: adminToken, body: newRouteBody() });
    const id = (c.body as { id: number }).id;
    const r = await http('PATCH', `/routes/${id}`, {
      token: adminToken,
      body: { distanceKm: 250, durationMinutes: 300 },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ distanceKm: 250, durationMinutes: 300 });
  });

  it('PATCH /routes/:id rejects fromStationId mutation with 400 (Zod strips or rejects)', async () => {
    const c = await http('POST', '/routes', { token: adminToken, body: newRouteBody() });
    const id = (c.body as { id: number }).id;
    // Empty PATCH should be rejected because at-least-one rule applies after strip.
    const r = await http('PATCH', `/routes/${id}`, {
      token: adminToken,
      body: { fromStationId: 999 },
    });
    expect(r.status).toBe(400);
  });

  it('PATCH /routes/:id returns 404 when missing', async () => {
    const r = await http('PATCH', '/routes/99999', {
      token: adminToken,
      body: { distanceKm: 100 },
    });
    expect(r.status).toBe(404);
  });

  it('PATCH /routes/:id rejects update from another operator with 403', async () => {
    const c = await http('POST', '/routes', {
      token: adminToken,
      body: newRouteBody({ companyId: op1Id }),
    });
    const id = (c.body as { id: number }).id;
    const r = await http('PATCH', `/routes/${id}`, {
      token: op2Token,
      body: { distanceKm: 250 },
    });
    expect(r.status).toBe(403);
  });

  it('DELETE /routes/:id deletes (admin)', async () => {
    const c = await http('POST', '/routes', { token: adminToken, body: newRouteBody() });
    const id = (c.body as { id: number }).id;
    const del = await http('DELETE', `/routes/${id}`, { token: adminToken });
    expect(del.status).toBe(204);
    const after = await http('GET', `/routes/${id}`);
    expect(after.status).toBe(404);
  });

  it('DELETE /routes/:id rejects another operator with 403', async () => {
    const c = await http('POST', '/routes', {
      token: adminToken,
      body: newRouteBody({ companyId: op1Id }),
    });
    const id = (c.body as { id: number }).id;
    const del = await http('DELETE', `/routes/${id}`, { token: op2Token });
    expect(del.status).toBe(403);
  });

  it('DELETE /routes/:id returns 404 when missing', async () => {
    const r = await http('DELETE', '/routes/99999', { token: adminToken });
    expect(r.status).toBe(404);
  });
});
