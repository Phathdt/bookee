import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeRoutesRepository } from '../../../../../test/factories/routes-repository.fake';
import { makeFakeTripsRepository } from '../../../../../test/factories/trips-repository.fake';
import { makeFakeVehiclesRepository } from '../../../../../test/factories/vehicles-repository.fake';
import {
  TripConflictError,
  TripForbiddenError,
  TripInvalidTransitionError,
  TripNotFoundError,
  TripValidationError,
} from '../../domain/errors';
import { ITripsRepository } from '../../domain/interfaces/trips.repository';
import { ActorContext } from '../../domain/interfaces/trips.service';
import { IRoutesRepository } from '@/modules/routes/domain/interfaces/routes.repository';
import { IVehiclesRepository } from '@/modules/vehicles/domain/interfaces/vehicles.repository';

import { TripsService } from './trips.service';

const adminActor: ActorContext = { actorOperatorId: null };
const op1Actor: ActorContext = { actorOperatorId: 1 };
const op2Actor: ActorContext = { actorOperatorId: 2 };

const dep = new Date('2030-06-01T08:00:00Z');
const arr = new Date('2030-06-01T10:00:00Z');

describe('TripsService', () => {
  let tripsRepo: ITripsRepository;
  let routesRepo: IRoutesRepository;
  let vehiclesRepo: IVehiclesRepository;
  let service: TripsService;

  let routeId: number;
  let vehicleId: number;
  let route2Id: number;
  let vehicle2Id: number;

  beforeEach(async () => {
    tripsRepo = makeFakeTripsRepository();
    routesRepo = makeFakeRoutesRepository();
    vehiclesRepo = makeFakeVehiclesRepository();
    service = new TripsService(tripsRepo, routesRepo, vehiclesRepo);

    // op1 route + vehicle
    const route = await routesRepo.create({
      companyId: 1,
      fromStationId: 10,
      toStationId: 20,
      distanceKm: 100,
      durationMinutes: 120,
    });
    routeId = route.id;

    const vehicle = await vehiclesRepo.create({
      companyId: 1,
      plateNumber: '51A-00001',
      type: 'sleeper',
      seatLayoutId: 1,
      totalSeats: 40,
    });
    vehicleId = vehicle.id;

    // op2 route + vehicle
    const route2 = await routesRepo.create({
      companyId: 2,
      fromStationId: 30,
      toStationId: 40,
      distanceKm: 50,
      durationMinutes: 60,
    });
    route2Id = route2.id;

    const vehicle2 = await vehiclesRepo.create({
      companyId: 2,
      plateNumber: '51B-00002',
      type: 'seater',
      seatLayoutId: 2,
      totalSeats: 30,
    });
    vehicle2Id = vehicle2.id;
  });

  function validInput(overrides: Partial<{ routeId: number; vehicleId: number }> = {}) {
    return {
      routeId: overrides.routeId ?? routeId,
      vehicleId: overrides.vehicleId ?? vehicleId,
      departureTime: dep,
      arrivalTime: arr,
      basePrice: 50_000,
    };
  }

  describe('create', () => {
    it('persists a valid trip (admin)', async () => {
      const t = await service.create(validInput(), adminActor);
      expect(t.id).toBeTypeOf('number');
      expect(t.status).toBe('scheduled');
      expect(t.routeId).toBe(routeId);
    });

    it('persists for matching operator', async () => {
      const t = await service.create(validInput(), op1Actor);
      expect(t.vehicleId).toBe(vehicleId);
    });

    it('rejects when actor is op2 but resource belongs to op1', async () => {
      await expect(service.create(validInput(), op2Actor)).rejects.toBeInstanceOf(
        TripForbiddenError,
      );
    });

    it('rejects when departureTime >= arrivalTime', async () => {
      await expect(
        service.create({ ...validInput(), departureTime: arr, arrivalTime: dep }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects when departureTime equals arrivalTime', async () => {
      await expect(
        service.create({ ...validInput(), departureTime: dep, arrivalTime: dep }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects unknown routeId with TripValidationError', async () => {
      await expect(
        service.create({ ...validInput(), routeId: 99999 }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects unknown vehicleId with TripValidationError', async () => {
      await expect(
        service.create({ ...validInput(), vehicleId: 99999 }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects cross-operator route+vehicle with TripValidationError', async () => {
      await expect(
        service.create({ ...validInput(), routeId: route2Id, vehicleId }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects overlapping trip on same vehicle', async () => {
      await service.create(validInput(), adminActor);
      // Overlapping window: starts 1h before arrival
      const overlap = {
        ...validInput(),
        departureTime: new Date('2030-06-01T09:00:00Z'),
        arrivalTime: new Date('2030-06-01T11:00:00Z'),
      };
      await expect(service.create(overlap, adminActor)).rejects.toBeInstanceOf(TripConflictError);
    });

    it('allows touching at exact endpoints (no conflict)', async () => {
      await service.create(validInput(), adminActor);
      // Starts exactly when previous ends — half-open, no conflict
      const touching = {
        ...validInput(),
        departureTime: arr,
        arrivalTime: new Date('2030-06-01T12:00:00Z'),
      };
      const t = await service.create(touching, adminActor);
      expect(t.id).toBeTypeOf('number');
    });

    it('allows non-overlapping trip on same vehicle on a different day', async () => {
      await service.create(validInput(), adminActor);
      const next = {
        ...validInput(),
        departureTime: new Date('2030-06-02T08:00:00Z'),
        arrivalTime: new Date('2030-06-02T10:00:00Z'),
      };
      const t = await service.create(next, adminActor);
      expect(t.id).toBeTypeOf('number');
    });

    it('cancelled trips do not block new trips in same window', async () => {
      const t = await service.create(validInput(), adminActor);
      await service.setStatus(t.id, 'cancelled', adminActor);
      const t2 = await service.create(validInput(), adminActor);
      expect(t2.id).toBeTypeOf('number');
    });
  });

  describe('getById', () => {
    it('returns trip when it exists', async () => {
      const created = await service.create(validInput(), adminActor);
      const found = await service.getById(created.id);
      expect(found.id).toBe(created.id);
    });

    it('throws TripNotFoundError for missing id', async () => {
      await expect(service.getById(99999)).rejects.toBeInstanceOf(TripNotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await service.create(validInput(), adminActor);
      await service.create(
        {
          ...validInput({ vehicleId: vehicle2Id, routeId: route2Id }),
          departureTime: new Date('2030-07-01T08:00:00Z'),
          arrivalTime: new Date('2030-07-01T09:00:00Z'),
        },
        adminActor,
      );
    });

    it('returns all without filter', async () => {
      expect((await service.list({})).length).toBe(2);
    });

    it('filters by vehicleId', async () => {
      const result = await service.list({ vehicleId });
      expect(result.length).toBe(1);
      expect(result[0]!.vehicleId).toBe(vehicleId);
    });

    it('filters by routeId', async () => {
      const result = await service.list({ routeId });
      expect(result.length).toBe(1);
      expect(result[0]!.routeId).toBe(routeId);
    });

    it('filters by status', async () => {
      const trips = await service.list({});
      await service.setStatus(trips[0]!.id, 'cancelled', adminActor);
      const active = await service.list({ status: 'scheduled' });
      expect(active.length).toBe(1);
    });

    it('filters by from date', async () => {
      const result = await service.list({ from: new Date('2030-07-01T00:00:00Z') });
      expect(result.length).toBe(1);
      expect(result[0]!.vehicleId).toBe(vehicle2Id);
    });
  });

  describe('setStatus', () => {
    it('transitions scheduled → in_progress', async () => {
      const t = await service.create(validInput(), adminActor);
      const updated = await service.setStatus(t.id, 'in_progress', adminActor);
      expect(updated.status).toBe('in_progress');
    });

    it('transitions scheduled → cancelled', async () => {
      const t = await service.create(validInput(), adminActor);
      const updated = await service.setStatus(t.id, 'cancelled', adminActor);
      expect(updated.status).toBe('cancelled');
    });

    it('transitions in_progress → completed', async () => {
      const t = await service.create(validInput(), adminActor);
      await service.setStatus(t.id, 'in_progress', adminActor);
      const updated = await service.setStatus(t.id, 'completed', adminActor);
      expect(updated.status).toBe('completed');
    });

    it('rejects completed → anything with TripInvalidTransitionError', async () => {
      const t = await service.create(validInput(), adminActor);
      await service.setStatus(t.id, 'in_progress', adminActor);
      await service.setStatus(t.id, 'completed', adminActor);
      await expect(service.setStatus(t.id, 'cancelled', adminActor)).rejects.toBeInstanceOf(
        TripInvalidTransitionError,
      );
    });

    it('rejects cancelled → anything with TripInvalidTransitionError', async () => {
      const t = await service.create(validInput(), adminActor);
      await service.setStatus(t.id, 'cancelled', adminActor);
      await expect(service.setStatus(t.id, 'scheduled', adminActor)).rejects.toBeInstanceOf(
        TripInvalidTransitionError,
      );
    });

    it('rejects scheduled → completed directly with TripInvalidTransitionError', async () => {
      const t = await service.create(validInput(), adminActor);
      await expect(service.setStatus(t.id, 'completed', adminActor)).rejects.toBeInstanceOf(
        TripInvalidTransitionError,
      );
    });

    it('throws TripNotFoundError for missing trip', async () => {
      await expect(service.setStatus(99999, 'in_progress', adminActor)).rejects.toBeInstanceOf(
        TripNotFoundError,
      );
    });

    it('rejects op2 modifying op1 trip with TripForbiddenError', async () => {
      const t = await service.create(validInput(), adminActor);
      await expect(service.setStatus(t.id, 'in_progress', op2Actor)).rejects.toBeInstanceOf(
        TripForbiddenError,
      );
    });
  });

  describe('createBulk', () => {
    const bulkBase = {
      routeId: 0,
      vehicleId: 0,
      basePrice: 50_000,
      dateRange: { start: '2030-09-01', end: '2030-09-03' },
      dailyDepartureTime: '08:00',
      tripDurationMinutes: 120,
    };

    it('creates one trip per day in range', async () => {
      const trips = await service.createBulk({ ...bulkBase, routeId, vehicleId }, adminActor);
      expect(trips.length).toBe(3);
      expect(trips[0]!.departureTime.toISOString().startsWith('2030-09-01')).toBe(true);
      expect(trips[1]!.departureTime.toISOString().startsWith('2030-09-02')).toBe(true);
      expect(trips[2]!.departureTime.toISOString().startsWith('2030-09-03')).toBe(true);
    });

    it('all bulk trips have correct duration', async () => {
      const trips = await service.createBulk({ ...bulkBase, routeId, vehicleId }, adminActor);
      for (const t of trips) {
        const diff = (t.arrivalTime.getTime() - t.departureTime.getTime()) / 60_000;
        expect(diff).toBe(120);
      }
    });

    it('all bulk trips default to scheduled', async () => {
      const trips = await service.createBulk({ ...bulkBase, routeId, vehicleId }, adminActor);
      for (const t of trips) {
        expect(t.status).toBe('scheduled');
      }
    });

    it('rejects cross-operator route+vehicle', async () => {
      await expect(
        service.createBulk({ ...bulkBase, routeId, vehicleId: vehicle2Id }, adminActor),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects start > end date range', async () => {
      await expect(
        service.createBulk(
          {
            ...bulkBase,
            routeId,
            vehicleId,
            dateRange: { start: '2030-09-05', end: '2030-09-03' },
          },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(TripValidationError);
    });

    it('rejects when bulk trip conflicts with existing trip in DB', async () => {
      await service.create(
        {
          routeId,
          vehicleId,
          departureTime: new Date('2030-09-02T07:00:00Z'),
          arrivalTime: new Date('2030-09-02T09:00:00Z'),
          basePrice: 10_000,
        },
        adminActor,
      );
      await expect(
        service.createBulk({ ...bulkBase, routeId, vehicleId }, adminActor),
      ).rejects.toBeInstanceOf(TripConflictError);
    });

    it('is atomic — no trips inserted when any conflict exists', async () => {
      await service.create(
        {
          routeId,
          vehicleId,
          departureTime: new Date('2030-09-02T07:00:00Z'),
          arrivalTime: new Date('2030-09-02T09:00:00Z'),
          basePrice: 10_000,
        },
        adminActor,
      );
      const before = (await service.list({ vehicleId })).length;
      await expect(
        service.createBulk({ ...bulkBase, routeId, vehicleId }, adminActor),
      ).rejects.toBeInstanceOf(TripConflictError);
      const after = (await service.list({ vehicleId })).length;
      expect(after).toBe(before); // nothing was inserted
    });

    it('rejects when operator does not own the resources', async () => {
      await expect(
        service.createBulk({ ...bulkBase, routeId, vehicleId }, op2Actor),
      ).rejects.toBeInstanceOf(TripForbiddenError);
    });
  });
});
