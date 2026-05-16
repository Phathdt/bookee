import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startPostgresFixture, type PostgresFixture } from '../../../test/postgres-fixture';
import { AppModule } from '../../app.module';
import { DatabaseService } from '../../modules/database/database.service';

describe('UsersController (HTTP integration)', () => {
  let fx: PostgresFixture;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    process.env.DATABASE_URL = fx.connectionString;
    process.env.JWT_SECRET = 'users-integration-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
    await fx.prisma.user.deleteMany({});
  });

  async function http(
    method: 'GET' | 'PATCH' | 'POST',
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

  async function register(suffix: string): Promise<{ accessToken: string; userId: number }> {
    const res = await http('POST', '/auth/register', {
      body: {
        name: `User ${suffix}`,
        phone: `09001${suffix.padStart(5, '0')}`,
        email: `${suffix}@u.test`,
        password: 'sup3rsecure',
      },
    });
    const session = res.body as {
      user: { id: number };
      tokens: { accessToken: string };
    };
    return { accessToken: session.tokens.accessToken, userId: session.user.id };
  }

  it('GET /users/me returns 401 without token', async () => {
    const res = await http('GET', '/users/me');
    expect(res.status).toBe(401);
  });

  it('GET /users/me returns the authenticated user profile', async () => {
    const { accessToken } = await register('1');
    const res = await http('GET', '/users/me', { token: accessToken });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: '1@u.test', role: 'customer' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('PATCH /users/me updates the phone (phone-only path)', async () => {
    const { accessToken } = await register('8');
    const res = await http('PATCH', '/users/me', {
      token: accessToken,
      body: { phone: '0900999888' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { phone: string }).phone).toBe('0900999888');
  });

  it('PATCH /users/me updates email when no collision', async () => {
    const { accessToken } = await register('9');
    const res = await http('PATCH', '/users/me', {
      token: accessToken,
      body: { email: 'renamed-9@u.test' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { email: string }).email).toBe('renamed-9@u.test');
  });

  it('PATCH /users/me updates the name', async () => {
    const { accessToken } = await register('2');
    const res = await http('PATCH', '/users/me', {
      token: accessToken,
      body: { name: 'Renamed' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { name: string }).name).toBe('Renamed');
  });

  it('PATCH /users/me rejects email collision with 409', async () => {
    const a = await register('3');
    await register('4');
    const res = await http('PATCH', '/users/me', {
      token: a.accessToken,
      body: { email: '4@u.test' },
    });
    expect(res.status).toBe(409);
  });

  it('PATCH /users/me with empty body returns 400 (Zod refine)', async () => {
    const { accessToken } = await register('5');
    const res = await http('PATCH', '/users/me', { token: accessToken, body: {} });
    expect(res.status).toBe(400);
  });

  it('PATCH /users/me with invalid email returns 400', async () => {
    const { accessToken } = await register('6');
    const res = await http('PATCH', '/users/me', {
      token: accessToken,
      body: { email: 'not-an-email' },
    });
    expect(res.status).toBe(400);
  });

  it('GET /users/me with a token for a since-deleted user returns 404', async () => {
    const { accessToken, userId } = await register('7');
    await fx.prisma.user.delete({ where: { id: userId } });
    const res = await http('GET', '/users/me', { token: accessToken });
    expect(res.status).toBe(404);
  });
});
