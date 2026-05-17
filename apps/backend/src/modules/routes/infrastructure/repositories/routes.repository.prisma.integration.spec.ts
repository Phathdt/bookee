import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { RoutesRepositoryPrisma } from './routes.repository.prisma';

describe('RoutesRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: RoutesRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new RoutesRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  async function seedDeps() {
    const company = await fx.prisma.busCompany.create({
      data: { name: 'Route Co', hotline: '1900000', status: 'active' },
    });
    const stationA = await fx.prisma.station.create({
      data: { name: 'Station A', address: 'Addr A', lat: 21.0, lng: 105.0, city: 'Hanoi' },
    });
    const stationB = await fx.prisma.station.create({
      data: { name: 'Station B', address: 'Addr B', lat: 10.0, lng: 106.0, city: 'HCM' },
    });
    return { company, stationA, stationB };
  }

  it('create: happy path returns route entity', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const route = await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 1700,
      durationMinutes: 1440,
    });
    expect(route.id).toBeTypeOf('number');
    expect(route.companyId).toBe(company.id);
    expect(route.distanceKm).toBe(1700);
  });

  it('findById: returns entity for existing route', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const created = await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 500,
      durationMinutes: 300,
    });
    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    expect(await repo.findById(99999)).toBeNull();
  });

  it('list: no filter returns all routes ordered by id', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const input = {
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    };
    await repo.create(input);
    await repo.create({ ...input, distanceKm: 200, durationMinutes: 120 });
    const all = await repo.list({});
    expect(all.length).toBe(2);
    expect(all.at(0)!.id).toBeLessThan(all.at(1)!.id);
  });

  it('list: filter by companyId returns only matching routes', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const company2 = await fx.prisma.busCompany.create({
      data: { name: 'Other Co', hotline: '1900001', status: 'active' },
    });
    const input = {
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    };
    await repo.create({ ...input, companyId: company.id });
    await repo.create({ ...input, companyId: company2.id });

    const result = await repo.list({ companyId: company.id });
    expect(result.length).toBe(1);
    expect(result.at(0)!.companyId).toBe(company.id);
  });

  it('list: filter by fromStationId returns only matching routes', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const stationC = await fx.prisma.station.create({
      data: { name: 'Station C', address: 'Addr C', lat: 16.0, lng: 108.0, city: 'Danang' },
    });
    await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    });
    await repo.create({
      companyId: company.id,
      fromStationId: stationC.id,
      toStationId: stationB.id,
      distanceKm: 200,
      durationMinutes: 120,
    });

    const result = await repo.list({ fromStationId: stationA.id });
    expect(result.length).toBe(1);
    expect(result.at(0)!.fromStationId).toBe(stationA.id);
  });

  it('list: filter by toStationId returns only matching routes', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const stationC = await fx.prisma.station.create({
      data: { name: 'Station C', address: 'Addr C', lat: 16.0, lng: 108.0, city: 'Danang' },
    });
    await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    });
    await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationC.id,
      distanceKm: 200,
      durationMinutes: 120,
    });

    const result = await repo.list({ toStationId: stationB.id });
    expect(result.length).toBe(1);
    expect(result.at(0)!.toStationId).toBe(stationB.id);
  });

  it('list: combined filters narrow results correctly', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const company2 = await fx.prisma.busCompany.create({
      data: { name: 'Other Co', hotline: '1900001', status: 'active' },
    });
    const input = {
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    };
    await repo.create({ ...input, companyId: company.id });
    await repo.create({ ...input, companyId: company2.id });

    const result = await repo.list({ companyId: company.id, fromStationId: stationA.id });
    expect(result.length).toBe(1);
    expect(result.at(0)!.companyId).toBe(company.id);
  });

  it('update: partial fields (distanceKm only)', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const route = await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    });
    const updated = await repo.update(route.id, { distanceKm: 999 });
    expect(updated.distanceKm).toBe(999);
    expect(updated.durationMinutes).toBe(60);
  });

  it('delete: removes route from database', async () => {
    const { company, stationA, stationB } = await seedDeps();
    const route = await repo.create({
      companyId: company.id,
      fromStationId: stationA.id,
      toStationId: stationB.id,
      distanceKm: 100,
      durationMinutes: 60,
    });
    await repo.delete(route.id);
    expect(await repo.findById(route.id)).toBeNull();
  });
});
