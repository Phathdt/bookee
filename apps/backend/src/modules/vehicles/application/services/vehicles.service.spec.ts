import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeSeatLayoutsRepository } from '../../../../../test/factories/seat-layouts-repository.fake';
import { makeFakeVehiclesRepository } from '../../../../../test/factories/vehicles-repository.fake';
import {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from '../../domain/errors';
import { IVehiclesRepository } from '../../domain/interfaces/vehicles.repository';
import { ActorContext } from '../../domain/interfaces/vehicles.service';

import { VehiclesService } from './vehicles.service';

import { ISeatLayoutsRepository } from '@/modules/seat-layouts/domain/interfaces/seat-layouts.repository';

const adminActor: ActorContext = { actorOperatorId: null };
const op1Actor: ActorContext = { actorOperatorId: 1 };
const op2Actor: ActorContext = { actorOperatorId: 2 };

const validSeats = [
  { code: 'A1', floor: 1, row: 1, col: 1 },
  { code: 'A2', floor: 1, row: 1, col: 2 },
];

describe('VehiclesService', () => {
  let vehicles: IVehiclesRepository;
  let seatLayouts: ISeatLayoutsRepository;
  let service: VehiclesService;
  let layoutId: number;

  function setup(opts: { hasActiveTrips?: (id: number) => boolean } = {}): void {
    vehicles = makeFakeVehiclesRepository(opts);
    seatLayouts = makeFakeSeatLayoutsRepository();
    service = new VehiclesService(vehicles, seatLayouts);
  }

  beforeEach(async () => {
    setup();
    // Pre-create a seat layout with 2 seats so vehicle tests can reference it
    const layout = await seatLayouts.create({
      name: 'Test Layout',
      rows: 1,
      cols: 2,
      seats: validSeats,
    });
    layoutId = layout.id;
  });

  function validInput(overrides: Partial<{ companyId: number; plateNumber: string }> = {}) {
    return {
      companyId: overrides.companyId ?? 1,
      plateNumber: overrides.plateNumber ?? '51A-00001',
      type: 'sleeper',
      seatLayoutId: layoutId,
      totalSeats: 2,
    };
  }

  describe('create', () => {
    it('persists a valid vehicle (admin)', async () => {
      const v = await service.create(validInput(), adminActor);
      expect(v.id).toBe(1);
      expect(v.companyId).toBe(1);
      expect(v.plateNumber).toBe('51A-00001');
    });

    it('persists for the matching operator', async () => {
      const v = await service.create(validInput({ companyId: 1 }), op1Actor);
      expect(v.companyId).toBe(1);
    });

    it('rejects creation for another operator with 403', async () => {
      await expect(service.create(validInput({ companyId: 1 }), op2Actor)).rejects.toBeInstanceOf(
        VehicleForbiddenError,
      );
    });

    it('rejects duplicate plate number', async () => {
      await service.create(validInput({ plateNumber: '51A-11111' }), adminActor);
      await expect(
        service.create(validInput({ plateNumber: '51A-11111' }), adminActor),
      ).rejects.toBeInstanceOf(VehiclePlateConflictError);
    });

    it('rejects totalSeats mismatch with layout seats count', async () => {
      await expect(
        service.create({ ...validInput(), totalSeats: 99 }, adminActor),
      ).rejects.toBeInstanceOf(VehicleValidationError);
    });

    it('rejects non-existent seatLayoutId', async () => {
      await expect(
        service.create({ ...validInput(), seatLayoutId: 99_999 }, adminActor),
      ).rejects.toBeInstanceOf(VehicleValidationError);
    });
  });

  describe('getById', () => {
    it('returns existing vehicle', async () => {
      const v = await service.create(validInput(), adminActor);
      const found = await service.getById(v.id);
      expect(found.id).toBe(v.id);
    });

    it('throws when missing', async () => {
      await expect(service.getById(99_999)).rejects.toBeInstanceOf(VehicleNotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await service.create(validInput({ companyId: 1, plateNumber: '51A-00001' }), adminActor);
      await service.create(validInput({ companyId: 1, plateNumber: '51A-00002' }), adminActor);
      await service.create(validInput({ companyId: 2, plateNumber: '51A-00003' }), adminActor);
    });

    it('returns all without filter', async () => {
      expect((await service.list({})).length).toBe(3);
    });

    it('filters by companyId', async () => {
      const result = await service.list({ companyId: 1 });
      expect(result.length).toBe(2);
      expect(result.every((v) => v.companyId === 1)).toBe(true);
    });

    it('filters by type', async () => {
      const result = await service.list({ type: 'sleeper' });
      expect(result.length).toBe(3);
    });
  });

  describe('update', () => {
    it('updates type (admin)', async () => {
      const v = await service.create(validInput(), adminActor);
      const updated = await service.update(v.id, { type: 'limousine' }, adminActor);
      expect(updated.type).toBe('limousine');
    });

    it('updates plateNumber to a unique new value', async () => {
      const v = await service.create(validInput({ plateNumber: '51A-11111' }), adminActor);
      const updated = await service.update(v.id, { plateNumber: '51A-22222' }, adminActor);
      expect(updated.plateNumber).toBe('51A-22222');
    });

    it('rejects updating plateNumber to an existing one', async () => {
      const v1 = await service.create(validInput({ plateNumber: '51A-11111' }), adminActor);
      await service.create(validInput({ plateNumber: '51A-22222' }), adminActor);
      await expect(
        service.update(v1.id, { plateNumber: '51A-22222' }, adminActor),
      ).rejects.toBeInstanceOf(VehiclePlateConflictError);
    });

    it('rejects update from another operator', async () => {
      const v = await service.create(validInput({ companyId: 1 }), adminActor);
      await expect(service.update(v.id, { type: 'limousine' }, op2Actor)).rejects.toBeInstanceOf(
        VehicleForbiddenError,
      );
    });

    it('rejects totalSeats mismatch on update', async () => {
      const v = await service.create(validInput(), adminActor);
      await expect(service.update(v.id, { totalSeats: 99 }, adminActor)).rejects.toBeInstanceOf(
        VehicleValidationError,
      );
    });

    it('allows updating same plate number (no conflict with self)', async () => {
      const v = await service.create(validInput({ plateNumber: '51A-11111' }), adminActor);
      const updated = await service.update(v.id, { plateNumber: '51A-11111' }, adminActor);
      expect(updated.plateNumber).toBe('51A-11111');
    });

    it('throws when vehicle missing', async () => {
      await expect(service.update(99_999, { type: 'x' }, adminActor)).rejects.toBeInstanceOf(
        VehicleNotFoundError,
      );
    });
  });

  describe('delete', () => {
    it('deletes when admin and no active trips', async () => {
      const v = await service.create(validInput(), adminActor);
      await service.delete(v.id, adminActor);
      await expect(service.getById(v.id)).rejects.toBeInstanceOf(VehicleNotFoundError);
    });

    it('deletes when matching operator', async () => {
      const v = await service.create(validInput({ companyId: 1 }), adminActor);
      await service.delete(v.id, op1Actor);
      await expect(service.getById(v.id)).rejects.toBeInstanceOf(VehicleNotFoundError);
    });

    it('rejects delete from another operator', async () => {
      const v = await service.create(validInput({ companyId: 1 }), adminActor);
      await expect(service.delete(v.id, op2Actor)).rejects.toBeInstanceOf(VehicleForbiddenError);
    });

    it('throws when vehicle missing', async () => {
      await expect(service.delete(99_999, adminActor)).rejects.toBeInstanceOf(VehicleNotFoundError);
    });

    it('throws VehicleInUseError when active trips exist', async () => {
      setup({ hasActiveTrips: () => true });
      // Re-create layout in new repo instance
      const layout = await seatLayouts.create({
        name: 'Layout2',
        rows: 1,
        cols: 2,
        seats: validSeats,
      });
      service = new VehiclesService(vehicles, seatLayouts);
      const v = await service.create({ ...validInput(), seatLayoutId: layout.id }, adminActor);
      await expect(service.delete(v.id, adminActor)).rejects.toBeInstanceOf(VehicleInUseError);
    });
  });
});
