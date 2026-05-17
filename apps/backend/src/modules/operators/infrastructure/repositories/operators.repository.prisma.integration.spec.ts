import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { OperatorsRepositoryPrisma } from './operators.repository.prisma';

describe('OperatorsRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: OperatorsRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new OperatorsRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  const base = { name: 'Alpha Bus', hotline: '1900123', logo: null };

  it('create: happy path returns operator entity', async () => {
    const op = await repo.create(base);
    expect(op.id).toBeTypeOf('number');
    expect(op.name).toBe(base.name);
    expect(op.hotline).toBe(base.hotline);
    expect(op.status).toBe('pending');
  });

  it('create: duplicate name throws Prisma unique constraint error', async () => {
    await repo.create(base);
    await expect(repo.create({ ...base, hotline: '1900999' })).rejects.toThrow();
  });

  it('findById: returns entity for existing operator', async () => {
    const created = await repo.create(base);
    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    const result = await repo.findById(99999);
    expect(result).toBeNull();
  });

  it('findByName: returns operator for exact name', async () => {
    await repo.create(base);
    const found = await repo.findByName(base.name);
    expect(found?.name).toBe(base.name);
  });

  it('findByName: returns null for missing name', async () => {
    const result = await repo.findByName('No Such Company');
    expect(result).toBeNull();
  });

  it('listAll: returns all operators ordered by id', async () => {
    await repo.create(base);
    await repo.create({ name: 'Beta Bus', hotline: '1900456' });
    const all = await repo.listAll();
    expect(all.length).toBe(2);
    expect(all.at(0)!.id).toBeLessThan(all.at(1)!.id);
  });

  it('listByStatus: filters by active status', async () => {
    const op = await repo.create(base);
    await repo.setStatus(op.id, 'active');
    await repo.create({ name: 'Beta Bus', hotline: '1900456' }); // stays pending

    const active = await repo.listByStatus('active');
    expect(active.length).toBe(1);
    expect(active.at(0)!.status).toBe('active');
  });

  it('listByStatus: returns empty when no operators match', async () => {
    await repo.create(base);
    const suspended = await repo.listByStatus('suspended');
    expect(suspended).toHaveLength(0);
  });

  it('setStatus: transitions status and returns updated entity', async () => {
    const op = await repo.create(base);
    const updated = await repo.setStatus(op.id, 'suspended');
    expect(updated.status).toBe('suspended');
  });

  it('update: partial fields (hotline only)', async () => {
    const op = await repo.create(base);
    const updated = await repo.update(op.id, { hotline: '1900000' });
    expect(updated.hotline).toBe('1900000');
    expect(updated.name).toBe(base.name);
  });

  it('update: logo field is updated', async () => {
    const op = await repo.create(base);
    const updated = await repo.update(op.id, { logo: 'https://cdn.example.com/logo.png' });
    expect(updated.logo).toBe('https://cdn.example.com/logo.png');
  });

  it('delete: removes operator from database', async () => {
    const op = await repo.create(base);
    await repo.delete(op.id);
    const found = await repo.findById(op.id);
    expect(found).toBeNull();
  });

  it('assignStaff effect: update user operatorId and role via user repo', async () => {
    const op = await repo.create(base);
    const user = await fx.prisma.user.create({
      data: {
        name: 'Driver Dan',
        phone: '0901111111',
        email: 'driver@example.com',
        passwordHash: 'h',
        role: 'customer',
      },
    });
    await fx.prisma.user.update({
      where: { id: user.id },
      data: { operatorId: op.id, role: 'driver' },
    });
    const updated = await fx.prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.operatorId).toBe(op.id);
    expect(updated?.role).toBe('driver');
  });
});
