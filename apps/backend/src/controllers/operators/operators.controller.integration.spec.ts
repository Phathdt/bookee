import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('OperatorsController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;
  let adminToken: string;
  let customerToken: string;
  let customerUserId: number;

  const JWT_SECRET = 'operators-integration-secret';

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

    // Mint an admin user + bearer token directly (skip registration which
    // can only mint customers).
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

    // Mint a plain customer via the auth endpoint so the bearer is realistic.
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
    const regBody = (await reg.json()) as {
      user: { id: number };
      tokens: { accessToken: string };
    };
    customerToken = regBody.tokens.accessToken;
    customerUserId = regBody.user.id;
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

  it('GET /operators returns only active operators (public)', async () => {
    const create = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Futa', hotline: '19001234' },
    });
    const id = (create.body as { id: number }).id;
    await http('PATCH', `/operators/${id}/status`, {
      token: adminToken,
      body: { status: 'active' },
    });
    await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Pending', hotline: '19009999' },
    });

    const res = await http('GET', '/operators');
    expect(res.status).toBe(200);
    expect(res.body as { name: string; status: string }[]).toHaveLength(1);
    expect((res.body as { name: string }[])[0]?.name).toBe('Futa');
  });

  // ---- Admin lifecycle ----------------------------------------------------

  it('POST /operators creates one (admin)', async () => {
    const res = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Thanh Buoi', hotline: '19002000' },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Thanh Buoi', status: 'pending' });
  });

  it('POST /operators returns 403 for customer role', async () => {
    const res = await http('POST', '/operators', {
      token: customerToken,
      body: { name: 'Customer Try', hotline: '19002111' },
    });
    expect(res.status).toBe(403);
  });

  it('POST /operators returns 401 without bearer', async () => {
    const res = await http('POST', '/operators', {
      body: { name: 'No Auth', hotline: '19003000' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /operators rejects duplicate name with 409', async () => {
    await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Dup', hotline: '19004000' },
    });
    const res = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Dup', hotline: '19004111' },
    });
    expect(res.status).toBe(409);
  });

  it('GET /operators/all (admin) returns every operator regardless of status', async () => {
    await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'X', hotline: '19005000' },
    });
    const res = await http('GET', '/operators/all', { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.body as unknown[]).toHaveLength(1);
  });

  it('PATCH /operators/:id updates hotline', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Y', hotline: '19006000' },
    });
    const id = (c.body as { id: number }).id;
    const res = await http('PATCH', `/operators/${id}`, {
      token: adminToken,
      body: { hotline: '19006999' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { hotline: string }).hotline).toBe('19006999');
  });

  it('PATCH /operators/:id updates name only', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Y2', hotline: '19006200' },
    });
    const id = (c.body as { id: number }).id;
    const res = await http('PATCH', `/operators/${id}`, {
      token: adminToken,
      body: { name: 'Y2-Renamed' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { name: string }).name).toBe('Y2-Renamed');
  });

  it('PATCH /operators/:id updates logo only', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Y3', hotline: '19006300' },
    });
    const id = (c.body as { id: number }).id;
    const res = await http('PATCH', `/operators/${id}`, {
      token: adminToken,
      body: { logo: 'https://example.com/logo.png' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { logo: string }).logo).toBe('https://example.com/logo.png');
  });

  it('PATCH /operators/:id/status activates an operator', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Z', hotline: '19007000' },
    });
    const id = (c.body as { id: number }).id;
    const res = await http('PATCH', `/operators/${id}/status`, {
      token: adminToken,
      body: { status: 'active' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { status: string }).status).toBe('active');
  });

  it('GET /operators/:id returns 404 when missing', async () => {
    const res = await http('GET', '/operators/99999');
    expect(res.status).toBe(404);
  });

  it('PATCH /operators/:id returns 404 when missing', async () => {
    const res = await http('PATCH', '/operators/99999', {
      token: adminToken,
      body: { hotline: '19000000' },
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /operators/:id/status returns 404 when missing', async () => {
    const res = await http('PATCH', '/operators/99999/status', {
      token: adminToken,
      body: { status: 'active' },
    });
    expect(res.status).toBe(404);
  });

  it('repo defensively coerces unknown status string back to pending', async () => {
    await fx.prisma.busCompany.create({
      data: { name: 'BadStatus', hotline: '19010000', status: 'galactic-overlord' },
    });
    const res = await http('GET', '/operators/all', { token: adminToken });
    const found = (res.body as { name: string; status: string }[]).find(
      (o) => o.name === 'BadStatus',
    );
    expect(found?.status).toBe('pending');
  });

  it('DELETE /operators/:id returns 204 then 404 afterwards', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'Dead', hotline: '19008000' },
    });
    const id = (c.body as { id: number }).id;
    const del = await http('DELETE', `/operators/${id}`, { token: adminToken });
    expect(del.status).toBe(204);
    const get = await http('GET', `/operators/${id}`);
    expect(get.status).toBe(404);
  });

  it('DELETE missing operator returns 404', async () => {
    const res = await http('DELETE', `/operators/99999`, { token: adminToken });
    expect(res.status).toBe(404);
  });

  // ---- Staff assignment --------------------------------------------------

  it('POST /operators/:id/staff attaches user with the requested role', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'StaffCo', hotline: '19009000' },
    });
    const opId = (c.body as { id: number }).id;
    await http('PATCH', `/operators/${opId}/status`, {
      token: adminToken,
      body: { status: 'active' },
    });

    const res = await http('POST', `/operators/${opId}/staff`, {
      token: adminToken,
      body: { userId: customerUserId, role: 'operator' },
    });
    expect(res.status).toBe(201);
    expect(res.body as { operatorId: number; role: string }).toMatchObject({
      operatorId: opId,
      role: 'operator',
    });
  });

  it('POST /operators/:id/staff returns 403 when operator is not active', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'PendingCo', hotline: '19009111' },
    });
    const opId = (c.body as { id: number }).id;
    const res = await http('POST', `/operators/${opId}/staff`, {
      token: adminToken,
      body: { userId: customerUserId, role: 'driver' },
    });
    expect(res.status).toBe(403);
  });

  it('POST /operators/:id/staff returns 400 when user does not exist', async () => {
    const c = await http('POST', '/operators', {
      token: adminToken,
      body: { name: 'NeedsStaff', hotline: '19009222' },
    });
    const opId = (c.body as { id: number }).id;
    await http('PATCH', `/operators/${opId}/status`, {
      token: adminToken,
      body: { status: 'active' },
    });
    const res = await http('POST', `/operators/${opId}/staff`, {
      token: adminToken,
      body: { userId: 99_999, role: 'driver' },
    });
    expect(res.status).toBe(400);
  });
});
