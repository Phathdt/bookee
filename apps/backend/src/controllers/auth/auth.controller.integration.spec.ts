import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('AuthController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    process.env.DATABASE_URL = fx.connectionString;
    process.env.JWT_SECRET = 'controller-integration-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Make AppModule's DatabaseService instance the same Prisma client
      // used by the fixture, so test cleanups + service queries hit one DB.
      .overrideProvider(DatabaseService)
      .useValue(fx.databaseService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.listen(0);

    const server = app.getHttpServer();
    const { port } = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  async function post(path: string, body: unknown): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  it('POST /auth/register returns 201 + AuthSession', async () => {
    const res = await post('/auth/register', {
      name: 'Ctrl Reg',
      phone: '0900222001',
      email: 'reg@ctrl.test',
      password: 'sup3rsecure',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: { email: 'reg@ctrl.test', role: 'customer' },
      tokens: { accessToken: expect.any(String), refreshToken: expect.any(String) },
    });
  });

  it('POST /auth/register rejects duplicate email with 409', async () => {
    await post('/auth/register', {
      name: 'X',
      phone: '0900222002',
      email: 'dup@ctrl.test',
      password: 'sup3rsecure',
    });
    const res = await post('/auth/register', {
      name: 'Y',
      phone: '0900222003',
      email: 'dup@ctrl.test',
      password: 'sup3rsecure',
    });
    expect(res.status).toBe(409);
  });

  it('POST /auth/register validates body (Zod): too-short password → 400', async () => {
    const res = await post('/auth/register', {
      name: 'X',
      phone: '0900222004',
      email: 'short@ctrl.test',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login with correct credentials returns AuthSession', async () => {
    await post('/auth/register', {
      name: 'Login',
      phone: '0900222005',
      email: 'login@ctrl.test',
      password: 'sup3rsecure',
    });
    const res = await post('/auth/login', {
      identifier: 'login@ctrl.test',
      password: 'sup3rsecure',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user: { email: 'login@ctrl.test' } });
  });

  it('POST /auth/login with wrong password returns 401', async () => {
    await post('/auth/register', {
      name: 'WrongPw',
      phone: '0900222006',
      email: 'wp@ctrl.test',
      password: 'sup3rsecure',
    });
    const res = await post('/auth/login', { identifier: 'wp@ctrl.test', password: 'badpassword' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh exchanges tokens', async () => {
    const reg = await post('/auth/register', {
      name: 'Refresh',
      phone: '0900222007',
      email: 'refresh@ctrl.test',
      password: 'sup3rsecure',
    });
    const refreshToken = (reg.body as { tokens: { refreshToken: string } }).tokens.refreshToken;
    const res = await post('/auth/refresh', { refreshToken });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('POST /auth/refresh with bogus token returns 401', async () => {
    const res = await post('/auth/refresh', { refreshToken: 'not-a-token' });
    expect(res.status).toBe(401);
  });
});
