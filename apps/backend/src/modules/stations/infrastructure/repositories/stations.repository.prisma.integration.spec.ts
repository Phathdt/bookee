import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { StationsRepositoryPrisma } from './stations.repository.prisma';

describe('StationsRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: StationsRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new StationsRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  const hanoi = {
    name: 'Mỹ Đình',
    address: '72 Phạm Hùng',
    lat: 21.028,
    lng: 105.782,
    city: 'Hà Nội',
  };
  const hcm = {
    name: 'Bến xe Miền Đông',
    address: '292 Đinh Bộ Lĩnh',
    lat: 10.814,
    lng: 106.714,
    city: 'Hồ Chí Minh',
  };

  it('create: happy path returns station entity', async () => {
    const s = await repo.create(hanoi);
    expect(s.id).toBeTypeOf('number');
    expect(s.name).toBe(hanoi.name);
    expect(s.city).toBe(hanoi.city);
  });

  it('findById: returns entity for existing station', async () => {
    const created = await repo.create(hanoi);
    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    expect(await repo.findById(99999)).toBeNull();
  });

  it('list: returns all stations when no filter', async () => {
    await repo.create(hanoi);
    await repo.create(hcm);
    const all = await repo.list({});
    expect(all.length).toBe(2);
  });

  it('list: filters by city (case-insensitive)', async () => {
    await repo.create(hanoi);
    await repo.create(hcm);
    const result = await repo.list({ city: 'hà nội' });
    expect(result.length).toBe(1);
    expect(result.at(0)!.city).toBe('Hà Nội');
  });

  it('list: diacritic-insensitive q filter matches Vietnamese station name', async () => {
    await repo.create(hanoi);
    await repo.create(hcm);
    // "my dinh" should match "Mỹ Đình"
    const result = await repo.list({ q: 'my dinh' });
    expect(result.length).toBe(1);
    expect(result.at(0)!.name).toBe('Mỹ Đình');
  });

  it('list: q filter with partial accent-stripped match', async () => {
    await repo.create(hcm);
    // "ben xe" should match "Bến xe Miền Đông"
    const result = await repo.list({ q: 'ben xe' });
    expect(result.length).toBe(1);
    expect(result.at(0)!.name).toBe('Bến xe Miền Đông');
  });

  it('list: q filter with city returns filtered subset', async () => {
    await repo.create(hanoi);
    await repo.create(hcm);
    const result = await repo.list({ city: 'Hà Nội', q: 'dinh' });
    expect(result.length).toBe(1);
  });

  it('list: q with no match returns empty array', async () => {
    await repo.create(hanoi);
    const result = await repo.list({ q: 'xyz no match' });
    expect(result).toHaveLength(0);
  });

  it('update: partial fields applied correctly', async () => {
    const s = await repo.create(hanoi);
    const updated = await repo.update(s.id, { name: 'Giáp Bát' });
    expect(updated.name).toBe('Giáp Bát');
    expect(updated.city).toBe(hanoi.city);
  });

  it('delete: removes station from database', async () => {
    const s = await repo.create(hanoi);
    await repo.delete(s.id);
    expect(await repo.findById(s.id)).toBeNull();
  });

  it('isReferencedByRoute: returns false when no route references station', async () => {
    const s = await repo.create(hanoi);
    expect(await repo.isReferencedByRoute(s.id)).toBe(false);
  });

  it('isReferencedByRoute: returns true after a route is created referencing station', async () => {
    const from = await repo.create(hanoi);
    const to = await repo.create(hcm);
    const company = await fx.prisma.busCompany.create({
      data: { name: 'Test Co', hotline: '1900000', status: 'active' },
    });
    await fx.prisma.route.create({
      data: {
        companyId: company.id,
        fromStationId: from.id,
        toStationId: to.id,
        distanceKm: 1700,
        durationMinutes: 1440,
      },
    });
    expect(await repo.isReferencedByRoute(from.id)).toBe(true);
    expect(await repo.isReferencedByRoute(to.id)).toBe(true);
  });
});
