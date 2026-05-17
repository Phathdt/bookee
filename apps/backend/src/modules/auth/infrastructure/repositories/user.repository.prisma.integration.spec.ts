import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { UserRepositoryPrisma } from './user.repository.prisma';

describe('UserRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: UserRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new UserRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  const base = {
    name: 'Test User',
    phone: '0901234567',
    email: 'test@example.com',
    passwordHash: 'hash123',
  };

  it('create: happy path returns user entity', async () => {
    const user = await repo.create(base);
    expect(user.id).toBeTypeOf('number');
    expect(user.name).toBe(base.name);
    expect(user.email).toBe(base.email);
    expect(user.role).toBe('customer');
  });

  it('create: duplicate email throws Prisma unique constraint error', async () => {
    await repo.create(base);
    await expect(repo.create({ ...base, phone: '0909999999' })).rejects.toThrow();
  });

  it('create: duplicate phone throws Prisma unique constraint error', async () => {
    await repo.create(base);
    await expect(repo.create({ ...base, email: 'other@example.com' })).rejects.toThrow();
  });

  it('findById: returns entity for existing user', async () => {
    const created = await repo.create(base);
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    const result = await repo.findById(99999);
    expect(result).toBeNull();
  });

  it('findByEmail: returns user for exact email match', async () => {
    await repo.create(base);
    const found = await repo.findByEmail(base.email);
    expect(found?.email).toBe(base.email);
  });

  it('findByEmail: returns null for missing email', async () => {
    const result = await repo.findByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('findByPhone: returns user for exact phone match', async () => {
    await repo.create(base);
    const found = await repo.findByPhone(base.phone);
    expect(found?.phone).toBe(base.phone);
  });

  it('findByPhone: returns null for missing phone', async () => {
    const result = await repo.findByPhone('0000000000');
    expect(result).toBeNull();
  });

  it('findByPhoneOrEmail: matches by email identifier', async () => {
    await repo.create(base);
    const found = await repo.findByPhoneOrEmail(base.email);
    expect(found?.email).toBe(base.email);
  });

  it('findByPhoneOrEmail: matches by phone identifier', async () => {
    await repo.create(base);
    const found = await repo.findByPhoneOrEmail(base.phone);
    expect(found?.phone).toBe(base.phone);
  });

  it('update: applies partial fields (name only)', async () => {
    const created = await repo.create(base);
    const updated = await repo.update(created.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.email).toBe(base.email);
  });

  it('update: sets operatorId and role for staff assignment', async () => {
    const company = await fx.prisma.busCompany.create({
      data: { name: 'TestCo', hotline: '1900000', status: 'active' },
    });
    const created = await repo.create(base);
    const updated = await repo.update(created.id, { operatorId: company.id, role: 'operator' });
    expect(updated.operatorId).toBe(company.id);
    expect(updated.role).toBe('operator');
  });

  it('create: custom role is persisted', async () => {
    const user = await repo.create({ ...base, role: 'admin' });
    expect(user.role).toBe('admin');
  });
});
