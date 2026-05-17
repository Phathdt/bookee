import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startPostgresFixture, PostgresFixture } from '../../../test/postgres-fixture';

import { AuthService } from './application/services/auth.service';
import { AuthConflictError, AuthUnauthorizedError } from './domain/errors';
import { JwtSignerNest } from './infrastructure/jwt-signer.nest';
import { UserRepositoryPrisma } from './infrastructure/repositories/user.repository.prisma';

describe('auth integration (real Postgres via testcontainers)', () => {
  let fx: PostgresFixture;
  let users: UserRepositoryPrisma;
  let service: AuthService;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    users = new UserRepositoryPrisma(fx.databaseService);
    const jwt = new JwtSignerNest(new JwtService({ secret: 'integration-test-secret' }));
    service = new AuthService(users, jwt);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  // ---- AuthService end-to-end ---------------------------------------------

  it('register persists a user the repository can load by email', async () => {
    const session = await service.register({
      name: 'Integration A',
      phone: '0900111001',
      email: 'a@integration.test',
      password: 'integration1',
    });
    const fromDb = await fx.prisma.user.findUnique({ where: { id: session.user.id } });
    expect(fromDb).not.toBeNull();
    expect(fromDb?.email).toBe('a@integration.test');
    expect(fromDb?.passwordHash).not.toBe('integration1');
    expect(fromDb?.role).toBe('customer');
  });

  it('login round-trip succeeds across a DB-backed repository', async () => {
    await service.register({
      name: 'Integration B',
      phone: '0900111002',
      email: 'b@integration.test',
      password: 'integration2',
    });
    const session = await service.login({
      identifier: '0900111002',
      password: 'integration2',
    });
    expect(session.user.email).toBe('b@integration.test');
    expect(session.tokens.accessToken).toBeTruthy();
  });

  it('duplicate email registration throws AuthConflictError', async () => {
    await service.register({
      name: 'Dup',
      phone: '0900111003',
      email: 'dup@integration.test',
      password: 'integration3',
    });
    await expect(
      service.register({
        name: 'Dup2',
        phone: '0900111004',
        email: 'dup@integration.test',
        password: 'integration4',
      }),
    ).rejects.toBeInstanceOf(AuthConflictError);
  });

  it('duplicate phone registration throws AuthConflictError', async () => {
    await service.register({
      name: 'Phone1',
      phone: '0900111099',
      email: 'p1@integration.test',
      password: 'integration1',
    });
    await expect(
      service.register({
        name: 'Phone2',
        phone: '0900111099',
        email: 'p2@integration.test',
        password: 'integration2',
      }),
    ).rejects.toBeInstanceOf(AuthConflictError);
  });

  it('login with wrong password throws AuthUnauthorizedError', async () => {
    await service.register({
      name: 'Wrong',
      phone: '0900111005',
      email: 'wrong@integration.test',
      password: 'integration5',
    });
    await expect(
      service.login({ identifier: 'wrong@integration.test', password: 'badpass' }),
    ).rejects.toBeInstanceOf(AuthUnauthorizedError);
  });

  it('login with unknown identifier throws AuthUnauthorizedError', async () => {
    await expect(
      service.login({ identifier: 'ghost@integration.test', password: 'whatever1' }),
    ).rejects.toBeInstanceOf(AuthUnauthorizedError);
  });

  it('refresh token issues a fresh pair', async () => {
    const session = await service.register({
      name: 'Refresh',
      phone: '0900111006',
      email: 'refresh@integration.test',
      password: 'integration6',
    });
    const next = await service.refresh(session.tokens.refreshToken);
    expect(next.accessToken).toBeTruthy();
    expect(next.refreshToken).toBeTruthy();
  });

  // ---- UserRepositoryPrisma branch coverage (direct repo calls) ----------

  it('repo.findById returns null when missing', async () => {
    expect(await users.findById(9_999_999)).toBeNull();
  });

  it('repo.findByEmail returns null when missing', async () => {
    expect(await users.findByEmail('nope@integration.test')).toBeNull();
  });

  it('repo.findByPhone returns null when missing', async () => {
    expect(await users.findByPhone('0000000000')).toBeNull();
  });

  it('repo.findByPhoneOrEmail returns null when missing', async () => {
    expect(await users.findByPhoneOrEmail('nope@integration.test')).toBeNull();
  });

  it('repo.create with no role argument defaults to customer (?? branch)', async () => {
    const u = await users.create({
      name: 'No Role',
      phone: '0900111333',
      email: 'norole@integration.test',
      passwordHash: 'h',
    });
    expect(u.role).toBe('customer');
  });

  it('repo.create with explicit non-customer role persists that role', async () => {
    const admin = await users.create({
      name: 'Admin Direct',
      phone: '0900111111',
      email: 'admin-direct@integration.test',
      passwordHash: 'h',
      role: 'admin',
    });
    expect(admin.role).toBe('admin');
  });

  it('repo coerces unknown role string back to customer', async () => {
    // Inject a bad role directly to exercise the defensive fallback in toEntity.
    await fx.prisma.user.create({
      data: {
        name: 'Bad Role',
        phone: '0900111222',
        email: 'bad@integration.test',
        passwordHash: 'h',
        role: 'galactic-overlord',
      },
    });
    const loaded = await users.findByEmail('bad@integration.test');
    expect(loaded?.role).toBe('customer');
  });
});
