import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { VehiclesRepositoryPrisma } from './vehicles.repository.prisma';

describe('VehiclesRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: VehiclesRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new VehiclesRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  async function seedDeps() {
    const company = await fx.prisma.busCompany.create({
      data: { name: 'Fleet Co', hotline: '1900000', status: 'active' },
    });
    const layout = await fx.prisma.seatLayout.create({
      data: { name: 'Layout A', rows: 5, cols: 4 },
    });
    return { company, layout };
  }

  const plateA = '51A-11111';
  const plateB = '51B-22222';

  it('create: happy path returns vehicle entity', async () => {
    const { company, layout } = await seedDeps();
    const vehicle = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    expect(vehicle.id).toBeTypeOf('number');
    expect(vehicle.plateNumber).toBe(plateA);
    expect(vehicle.type).toBe('sleeper');
  });

  it('create: duplicate plateNumber throws Prisma unique constraint error', async () => {
    const { company, layout } = await seedDeps();
    const base = {
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    };
    await repo.create(base);
    await expect(repo.create(base)).rejects.toThrow();
  });

  it('findById: returns entity for existing vehicle', async () => {
    const { company, layout } = await seedDeps();
    const created = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    expect(await repo.findById(99999)).toBeNull();
  });

  it('findByPlateNumber: returns vehicle for existing plate', async () => {
    const { company, layout } = await seedDeps();
    await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    const found = await repo.findByPlateNumber(plateA);
    expect(found?.plateNumber).toBe(plateA);
  });

  it('findByPlateNumber: returns null for missing plate', async () => {
    expect(await repo.findByPlateNumber('99Z-00000')).toBeNull();
  });

  it('list: no filter returns all vehicles ordered by id', async () => {
    const { company, layout } = await seedDeps();
    await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    await repo.create({
      companyId: company.id,
      plateNumber: plateB,
      type: 'seater',
      seatLayoutId: layout.id,
      totalSeats: 45,
    });
    const all = await repo.list({});
    expect(all.length).toBe(2);
    expect(all.at(0)!.id).toBeLessThan(all.at(1)!.id);
  });

  it('list: filter by companyId returns only matching vehicles', async () => {
    const { company, layout } = await seedDeps();
    const company2 = await fx.prisma.busCompany.create({
      data: { name: 'Other Co', hotline: '1900001', status: 'active' },
    });
    await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    await repo.create({
      companyId: company2.id,
      plateNumber: plateB,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });

    const result = await repo.list({ companyId: company.id });
    expect(result.length).toBe(1);
    expect(result.at(0)!.companyId).toBe(company.id);
  });

  it('list: filter by type returns only matching vehicles', async () => {
    const { company, layout } = await seedDeps();
    await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    await repo.create({
      companyId: company.id,
      plateNumber: plateB,
      type: 'seater',
      seatLayoutId: layout.id,
      totalSeats: 45,
    });

    const result = await repo.list({ type: 'sleeper' });
    expect(result.length).toBe(1);
    expect(result.at(0)!.type).toBe('sleeper');
  });

  it('list: combined companyId + type filter narrows results', async () => {
    const { company, layout } = await seedDeps();
    const company2 = await fx.prisma.busCompany.create({
      data: { name: 'Other Co', hotline: '1900001', status: 'active' },
    });
    await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    await repo.create({
      companyId: company2.id,
      plateNumber: plateB,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });

    const result = await repo.list({ companyId: company.id, type: 'sleeper' });
    expect(result.length).toBe(1);
    expect(result.at(0)!.companyId).toBe(company.id);
  });

  it('update: partial fields (type only)', async () => {
    const { company, layout } = await seedDeps();
    const v = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    const updated = await repo.update(v.id, { type: 'seater' });
    expect(updated.type).toBe('seater');
    expect(updated.plateNumber).toBe(plateA);
  });

  it('update: totalSeats field applied', async () => {
    const { company, layout } = await seedDeps();
    const v = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    const updated = await repo.update(v.id, { totalSeats: 44 });
    expect(updated.totalSeats).toBe(44);
  });

  it('delete: removes vehicle from database', async () => {
    const { company, layout } = await seedDeps();
    const v = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    await repo.delete(v.id);
    expect(await repo.findById(v.id)).toBeNull();
  });

  it('hasActiveTrips: returns false (stub — Trip module not yet built)', async () => {
    const { company, layout } = await seedDeps();
    const v = await repo.create({
      companyId: company.id,
      plateNumber: plateA,
      type: 'sleeper',
      seatLayoutId: layout.id,
      totalSeats: 40,
    });
    expect(await repo.hasActiveTrips(v.id)).toBe(false);
  });
});
