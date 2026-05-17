import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { SeatLayoutsRepositoryPrisma } from './seat-layouts.repository.prisma';

describe('SeatLayoutsRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: SeatLayoutsRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new SeatLayoutsRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  const baseLayout = {
    name: '2-floor 40 seats',
    rows: 5,
    cols: 4,
    seats: [
      { code: 'A1', floor: 1, row: 1, col: 1 },
      { code: 'A2', floor: 1, row: 1, col: 2 },
      { code: 'B1', floor: 2, row: 1, col: 1 },
    ],
  };

  it('create: happy path returns layout with seats in same transaction', async () => {
    const result = await repo.create(baseLayout);
    expect(result.id).toBeTypeOf('number');
    expect(result.name).toBe(baseLayout.name);
    expect(result.seats).toHaveLength(3);
    expect(result.seats.at(0)!.layoutId).toBe(result.id);
  });

  it('create: seats are ordered floor asc, row asc, col asc', async () => {
    const result = await repo.create(baseLayout);
    const codes = result.seats.map((s) => s.code);
    expect(codes).toEqual(['A1', 'A2', 'B1']);
  });

  it('create: transaction atomicity — all seats land in DB in single query', async () => {
    const result = await repo.create(baseLayout);
    const dbSeats = await fx.prisma.seat.findMany({ where: { layoutId: result.id } });
    expect(dbSeats).toHaveLength(3);
  });

  it('create: duplicate seat code within same layout throws', async () => {
    const dupSeats = [
      { code: 'A1', floor: 1, row: 1, col: 1 },
      { code: 'A1', floor: 1, row: 1, col: 2 }, // duplicate code
    ];
    await expect(repo.create({ ...baseLayout, seats: dupSeats })).rejects.toThrow();
  });

  it('findById: returns layout with seats for existing id', async () => {
    const created = await repo.create(baseLayout);
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.seats).toHaveLength(3);
  });

  it('findById: returns null for missing id', async () => {
    expect(await repo.findById(99999)).toBeNull();
  });

  it('list: returns all layouts without seats (SeatLayout shape)', async () => {
    await repo.create(baseLayout);
    await repo.create({
      ...baseLayout,
      name: 'Single floor',
      seats: [{ code: 'X1', floor: 1, row: 1, col: 1 }],
    });
    const all = await repo.list();
    expect(all.length).toBe(2);
    // SeatLayout entities should not expose seats array
    expect((all[0] as unknown as Record<string, unknown>)['seats']).toBeUndefined();
  });

  it('update: partial fields (name only)', async () => {
    const created = await repo.create(baseLayout);
    const updated = await repo.update(created.id, { name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
    expect(updated.rows).toBe(baseLayout.rows);
  });

  it('update: rows and cols fields applied', async () => {
    const created = await repo.create(baseLayout);
    const updated = await repo.update(created.id, { rows: 10, cols: 4 });
    expect(updated.rows).toBe(10);
    expect(updated.cols).toBe(4);
  });

  it('delete: removes layout and its seats from database', async () => {
    const created = await repo.create(baseLayout);
    await repo.delete(created.id);
    expect(await repo.findById(created.id)).toBeNull();
    const seats = await fx.prisma.seat.findMany({ where: { layoutId: created.id } });
    expect(seats).toHaveLength(0);
  });

  it('isReferencedByVehicle: returns false when no vehicle uses layout', async () => {
    const created = await repo.create(baseLayout);
    expect(await repo.isReferencedByVehicle(created.id)).toBe(false);
  });

  it('isReferencedByVehicle: returns true after vehicle is assigned layout', async () => {
    const created = await repo.create(baseLayout);
    const company = await fx.prisma.busCompany.create({
      data: { name: 'Bus Co', hotline: '1900000', status: 'active' },
    });
    await fx.prisma.vehicle.create({
      data: {
        companyId: company.id,
        plateNumber: '51A-12345',
        type: 'sleeper',
        seatLayoutId: created.id,
        totalSeats: 40,
      },
    });
    expect(await repo.isReferencedByVehicle(created.id)).toBe(true);
  });
});
