import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresFixture, startPostgresFixture } from '../../../../../test/postgres-fixture';
import { TripsRepositoryPrisma } from './trips.repository.prisma';

describe('TripsRepositoryPrisma (integration)', () => {
  let fx: PostgresFixture;
  let repo: TripsRepositoryPrisma;

  beforeAll(async () => {
    fx = await startPostgresFixture();
    repo = new TripsRepositoryPrisma(fx.databaseService);
  }, 120_000);

  afterAll(async () => {
    await fx.stop();
  });

  beforeEach(async () => {
    await fx.resetDatabase();
  });

  async function seedDeps() {
    const company = await fx.prisma.busCompany.create({
      data: { name: 'Trip Co', hotline: '1900888', status: 'active' },
    });
    const fromStation = await fx.prisma.station.create({
      data: { name: 'From', address: 'Addr A', lat: 10.0, lng: 106.0, city: 'CityA' },
    });
    const toStation = await fx.prisma.station.create({
      data: { name: 'To', address: 'Addr B', lat: 11.0, lng: 107.0, city: 'CityB' },
    });
    const route = await fx.prisma.route.create({
      data: {
        companyId: company.id,
        fromStationId: fromStation.id,
        toStationId: toStation.id,
        distanceKm: 150,
        durationMinutes: 180,
      },
    });
    const layout = await fx.prisma.seatLayout.create({
      data: { name: 'Layout', rows: 5, cols: 4 },
    });
    const vehicle = await fx.prisma.vehicle.create({
      data: {
        companyId: company.id,
        plateNumber: '51A-TRIP1',
        type: 'sleeper',
        seatLayoutId: layout.id,
        totalSeats: 40,
      },
    });
    return { company, route, vehicle };
  }

  const dep = new Date('2030-06-01T08:00:00Z');
  const arr = new Date('2030-06-01T10:00:00Z');

  it('create: returns trip entity with scheduled status', async () => {
    const { route, vehicle } = await seedDeps();
    const trip = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    expect(trip.id).toBeTypeOf('number');
    expect(trip.status).toBe('scheduled');
    expect(trip.basePrice).toBe(50_000);
  });

  it('findById: returns entity for existing trip', async () => {
    const { route, vehicle } = await seedDeps();
    const created = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('findById: returns null for missing id', async () => {
    expect(await repo.findById(99999)).toBeNull();
  });

  it('list: no filter returns all trips ordered by departureTime', async () => {
    const { route, vehicle } = await seedDeps();
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: new Date('2030-06-02T08:00:00Z'),
      arrivalTime: new Date('2030-06-02T10:00:00Z'),
      basePrice: 50_000,
    });
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    const all = await repo.list({});
    expect(all.length).toBe(2);
    expect(all[0]!.departureTime.getTime()).toBeLessThan(all[1]!.departureTime.getTime());
  });

  it('list: filter by vehicleId', async () => {
    const { route, vehicle } = await seedDeps();
    const company2 = await fx.prisma.busCompany.create({
      data: { name: 'Co2', hotline: '1900999', status: 'active' },
    });
    const layout2 = await fx.prisma.seatLayout.create({
      data: { name: 'L2', rows: 4, cols: 4 },
    });
    const vehicle2 = await fx.prisma.vehicle.create({
      data: {
        companyId: company2.id,
        plateNumber: '51B-TRIP2',
        type: 'seater',
        seatLayoutId: layout2.id,
        totalSeats: 30,
      },
    });
    const fromStation2 = await fx.prisma.station.create({
      data: { name: 'F2', address: 'Addr F2', lat: 14.0, lng: 108.0, city: 'CA' },
    });
    const toStation2 = await fx.prisma.station.create({
      data: { name: 'T2', address: 'Addr T2', lat: 15.0, lng: 109.0, city: 'CB' },
    });
    const route2 = await fx.prisma.route.create({
      data: {
        companyId: company2.id,
        fromStationId: fromStation2.id,
        toStationId: toStation2.id,
        distanceKm: 80,
        durationMinutes: 90,
      },
    });
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    await repo.create({
      routeId: route2.id,
      vehicleId: vehicle2.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 30_000,
    });
    const result = await repo.list({ vehicleId: vehicle.id });
    expect(result.length).toBe(1);
    expect(result[0]!.vehicleId).toBe(vehicle.id);
  });

  it('list: filter by status', async () => {
    const { route, vehicle } = await seedDeps();
    const t1 = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    await repo.updateStatus(t1.id, 'cancelled');
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: new Date('2030-07-01T08:00:00Z'),
      arrivalTime: new Date('2030-07-01T10:00:00Z'),
      basePrice: 50_000,
    });
    const scheduled = await repo.list({ status: 'scheduled' });
    expect(scheduled.length).toBe(1);
  });

  it('list: filter by from/to date range', async () => {
    const { route, vehicle } = await seedDeps();
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: new Date('2030-05-01T08:00:00Z'),
      arrivalTime: new Date('2030-05-01T10:00:00Z'),
      basePrice: 50_000,
    });
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: new Date('2030-06-15T08:00:00Z'),
      arrivalTime: new Date('2030-06-15T10:00:00Z'),
      basePrice: 50_000,
    });
    const result = await repo.list({
      from: new Date('2030-06-01T00:00:00Z'),
      to: new Date('2030-06-30T23:59:59Z'),
    });
    expect(result.length).toBe(1);
    expect(result[0]!.departureTime.getFullYear()).toBe(2030);
    expect(result[0]!.departureTime.getMonth()).toBe(5); // June = 5
  });

  it('updateStatus: changes status in db', async () => {
    const { route, vehicle } = await seedDeps();
    const t = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    const updated = await repo.updateStatus(t.id, 'in_progress');
    expect(updated.status).toBe('in_progress');
    const found = await repo.findById(t.id);
    expect(found?.status).toBe('in_progress');
  });

  it('createMany: inserts all rows atomically', async () => {
    const { route, vehicle } = await seedDeps();
    const inputs = [
      {
        routeId: route.id,
        vehicleId: vehicle.id,
        departureTime: new Date('2030-09-01T08:00:00Z'),
        arrivalTime: new Date('2030-09-01T10:00:00Z'),
        basePrice: 50_000,
      },
      {
        routeId: route.id,
        vehicleId: vehicle.id,
        departureTime: new Date('2030-09-02T08:00:00Z'),
        arrivalTime: new Date('2030-09-02T10:00:00Z'),
        basePrice: 50_000,
      },
    ];
    const trips = await repo.createMany(inputs);
    expect(trips.length).toBe(2);
    const all = await repo.list({});
    expect(all.length).toBe(2);
  });

  it('listConflictsForVehicle: detects overlapping scheduled trip', async () => {
    const { route, vehicle } = await seedDeps();
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    // Requested window overlaps: starts 1h before arr
    const conflicts = await repo.listConflictsForVehicle(
      vehicle.id,
      new Date('2030-06-01T09:00:00Z'),
      new Date('2030-06-01T11:00:00Z'),
    );
    expect(conflicts.length).toBe(1);
  });

  it('listConflictsForVehicle: cancelled trips are excluded', async () => {
    const { route, vehicle } = await seedDeps();
    const t = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    await repo.updateStatus(t.id, 'cancelled');
    const conflicts = await repo.listConflictsForVehicle(vehicle.id, dep, arr);
    expect(conflicts.length).toBe(0);
  });

  it('listConflictsForVehicle: touching endpoints do not conflict (half-open)', async () => {
    const { route, vehicle } = await seedDeps();
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    // New trip starts exactly at arr — should NOT conflict
    const conflicts = await repo.listConflictsForVehicle(
      vehicle.id,
      arr,
      new Date('2030-06-01T12:00:00Z'),
    );
    expect(conflicts.length).toBe(0);
  });

  it('listConflictsForVehicle: excludeTripId skips self', async () => {
    const { route, vehicle } = await seedDeps();
    const t = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    const conflicts = await repo.listConflictsForVehicle(vehicle.id, dep, arr, t.id);
    expect(conflicts.length).toBe(0);
  });

  it('hasActiveTrips: returns false when no trips', async () => {
    const { vehicle } = await seedDeps();
    expect(await repo.hasActiveTrips(vehicle.id)).toBe(false);
  });

  it('hasActiveTrips: returns true for scheduled trip', async () => {
    const { route, vehicle } = await seedDeps();
    await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    expect(await repo.hasActiveTrips(vehicle.id)).toBe(true);
  });

  it('hasActiveTrips: returns false after trip is cancelled', async () => {
    const { route, vehicle } = await seedDeps();
    const t = await repo.create({
      routeId: route.id,
      vehicleId: vehicle.id,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    });
    await repo.updateStatus(t.id, 'cancelled');
    expect(await repo.hasActiveTrips(vehicle.id)).toBe(false);
  });
});
