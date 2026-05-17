import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeRoutesRepository } from '../../../../../test/factories/routes-repository.fake';
import { RouteForbiddenError, RouteNotFoundError, RouteValidationError } from '../../domain/errors';
import { IRoutesRepository } from '../../domain/interfaces/routes.repository';
import { ActorContext } from '../../domain/interfaces/routes.service';

import { RoutesService } from './routes.service';

const adminActor: ActorContext = { actorOperatorId: null };
const op1Actor: ActorContext = { actorOperatorId: 1 };
const op2Actor: ActorContext = { actorOperatorId: 2 };

describe('RoutesService', () => {
  let routes: IRoutesRepository;
  let service: RoutesService;

  beforeEach(() => {
    routes = makeFakeRoutesRepository();
    service = new RoutesService(routes);
  });

  describe('create', () => {
    it('persists a valid route (admin)', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 300, durationMinutes: 360 },
        adminActor,
      );
      expect(r.id).toBe(1);
      expect(r.companyId).toBe(1);
    });

    it('persists for the matching operator', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        op1Actor,
      );
      expect(r.companyId).toBe(1);
    });

    it('rejects creation for another operator', async () => {
      await expect(
        service.create(
          {
            companyId: 1,
            fromStationId: 10,
            toStationId: 20,
            distanceKm: 100,
            durationMinutes: 60,
          },
          op2Actor,
        ),
      ).rejects.toBeInstanceOf(RouteForbiddenError);
    });

    it('rejects when from == to', async () => {
      await expect(
        service.create(
          {
            companyId: 1,
            fromStationId: 10,
            toStationId: 10,
            distanceKm: 100,
            durationMinutes: 60,
          },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(RouteValidationError);
    });

    it('rejects when distanceKm <= 0', async () => {
      await expect(
        service.create(
          { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 0, durationMinutes: 60 },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(RouteValidationError);
    });

    it('rejects when durationMinutes <= 0', async () => {
      await expect(
        service.create(
          { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 0 },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(RouteValidationError);
    });
  });

  describe('update', () => {
    it('updates distanceKm and durationMinutes', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      const updated = await service.update(
        r.id,
        { distanceKm: 200, durationMinutes: 120 },
        adminActor,
      );
      expect(updated.distanceKm).toBe(200);
      expect(updated.durationMinutes).toBe(120);
    });

    it('throws when route missing', async () => {
      await expect(service.update(99_999, { distanceKm: 200 }, adminActor)).rejects.toBeInstanceOf(
        RouteNotFoundError,
      );
    });

    it('rejects update from another operator', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await expect(service.update(r.id, { distanceKm: 200 }, op2Actor)).rejects.toBeInstanceOf(
        RouteForbiddenError,
      );
    });

    it('rejects update with non-positive distanceKm', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await expect(service.update(r.id, { distanceKm: 0 }, adminActor)).rejects.toBeInstanceOf(
        RouteValidationError,
      );
    });

    it('rejects update with non-positive durationMinutes', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await expect(
        service.update(r.id, { durationMinutes: -5 }, adminActor),
      ).rejects.toBeInstanceOf(RouteValidationError);
    });
  });

  describe('getById', () => {
    it('returns existing route', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      expect((await service.getById(r.id)).id).toBe(r.id);
    });

    it('throws when route missing', async () => {
      await expect(service.getById(99_999)).rejects.toBeInstanceOf(RouteNotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await service.create(
        { companyId: 1, fromStationId: 20, toStationId: 30, distanceKm: 150, durationMinutes: 90 },
        adminActor,
      );
      await service.create(
        { companyId: 2, fromStationId: 10, toStationId: 20, distanceKm: 110, durationMinutes: 70 },
        adminActor,
      );
    });

    it('returns all without filter', async () => {
      expect((await service.list({})).length).toBe(3);
    });

    it('filters by companyId', async () => {
      const r = await service.list({ companyId: 1 });
      expect(r.length).toBe(2);
    });

    it('filters by fromStationId', async () => {
      const r = await service.list({ fromStationId: 10 });
      expect(r.length).toBe(2);
    });

    it('filters by toStationId', async () => {
      const r = await service.list({ toStationId: 30 });
      expect(r.length).toBe(1);
    });
  });

  describe('delete', () => {
    it('deletes when admin', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await service.delete(r.id, adminActor);
      await expect(service.getById(r.id)).rejects.toBeInstanceOf(RouteNotFoundError);
    });

    it('deletes when matching operator', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await service.delete(r.id, op1Actor);
      await expect(service.getById(r.id)).rejects.toBeInstanceOf(RouteNotFoundError);
    });

    it('throws when route missing', async () => {
      await expect(service.delete(99_999, adminActor)).rejects.toBeInstanceOf(RouteNotFoundError);
    });

    it('rejects delete from another operator', async () => {
      const r = await service.create(
        { companyId: 1, fromStationId: 10, toStationId: 20, distanceKm: 100, durationMinutes: 60 },
        adminActor,
      );
      await expect(service.delete(r.id, op2Actor)).rejects.toBeInstanceOf(RouteForbiddenError);
    });
  });
});
