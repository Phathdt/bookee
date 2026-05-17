import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeSeatLayoutsRepository } from '../../../../../test/factories/seat-layouts-repository.fake';
import {
  SeatLayoutInUseError,
  SeatLayoutNotFoundError,
  SeatLayoutValidationError,
} from '../../domain/errors';
import { ISeatLayoutsRepository } from '../../domain/interfaces/seat-layouts.repository';

import { SeatLayoutsService } from './seat-layouts.service';

const validSeats = [
  { code: 'A1', floor: 1, row: 1, col: 1 },
  { code: 'A2', floor: 1, row: 1, col: 2 },
  { code: 'B1', floor: 1, row: 2, col: 1 },
  { code: 'B2', floor: 1, row: 2, col: 2 },
];

describe('SeatLayoutsService', () => {
  let repo: ISeatLayoutsRepository;
  let service: SeatLayoutsService;

  function setup(opts: { isReferencedByVehicle?: (id: number) => boolean } = {}): void {
    repo = makeFakeSeatLayoutsRepository(opts);
    service = new SeatLayoutsService(repo);
  }

  beforeEach(() => setup());

  describe('create', () => {
    it('persists a valid layout with seats', async () => {
      const layout = await service.create({ name: 'Bus 40', rows: 2, cols: 2, seats: validSeats });
      expect(layout.id).toBe(1);
      expect(layout.name).toBe('Bus 40');
      expect(layout.seats).toHaveLength(4);
    });

    it('rejects rows <= 0', async () => {
      await expect(
        service.create({ name: 'X', rows: 0, cols: 2, seats: validSeats }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects cols <= 0', async () => {
      await expect(
        service.create({ name: 'X', rows: 2, cols: -1, seats: validSeats }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects duplicate seat codes', async () => {
      await expect(
        service.create({
          name: 'X',
          rows: 2,
          cols: 2,
          seats: [
            { code: 'A1', floor: 1, row: 1, col: 1 },
            { code: 'A1', floor: 1, row: 1, col: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects duplicate seat positions (floor+row+col)', async () => {
      await expect(
        service.create({
          name: 'X',
          rows: 2,
          cols: 2,
          seats: [
            { code: 'A1', floor: 1, row: 1, col: 1 },
            { code: 'A2', floor: 1, row: 1, col: 1 },
          ],
        }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects seat row out of grid bounds', async () => {
      await expect(
        service.create({
          name: 'X',
          rows: 2,
          cols: 2,
          seats: [{ code: 'A1', floor: 1, row: 3, col: 1 }],
        }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects seat col out of grid bounds', async () => {
      await expect(
        service.create({
          name: 'X',
          rows: 2,
          cols: 2,
          seats: [{ code: 'A1', floor: 1, row: 1, col: 5 }],
        }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });

    it('rejects seat floor < 1', async () => {
      await expect(
        service.create({
          name: 'X',
          rows: 2,
          cols: 2,
          seats: [{ code: 'A1', floor: 0, row: 1, col: 1 }],
        }),
      ).rejects.toBeInstanceOf(SeatLayoutValidationError);
    });
  });

  describe('getById', () => {
    it('returns layout with seats', async () => {
      const created = await service.create({ name: 'Bus', rows: 2, cols: 2, seats: validSeats });
      const found = await service.getById(created.id);
      expect(found.id).toBe(created.id);
      expect(found.seats).toHaveLength(4);
    });

    it('throws when missing', async () => {
      await expect(service.getById(99_999)).rejects.toBeInstanceOf(SeatLayoutNotFoundError);
    });
  });

  describe('list', () => {
    it('returns all layouts', async () => {
      await service.create({ name: 'A', rows: 2, cols: 2, seats: validSeats });
      await service.create({ name: 'B', rows: 3, cols: 2, seats: validSeats.slice(0, 2) });
      const all = await service.list();
      expect(all).toHaveLength(2);
    });

    it('returns empty list initially', async () => {
      expect(await service.list()).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates name', async () => {
      const created = await service.create({ name: 'Old', rows: 2, cols: 2, seats: validSeats });
      const updated = await service.update(created.id, { name: 'New' });
      expect(updated.name).toBe('New');
    });

    it('rejects rows <= 0 on update', async () => {
      const created = await service.create({ name: 'X', rows: 2, cols: 2, seats: validSeats });
      await expect(service.update(created.id, { rows: 0 })).rejects.toBeInstanceOf(
        SeatLayoutValidationError,
      );
    });

    it('rejects cols <= 0 on update', async () => {
      const created = await service.create({ name: 'X', rows: 2, cols: 2, seats: validSeats });
      await expect(service.update(created.id, { cols: -1 })).rejects.toBeInstanceOf(
        SeatLayoutValidationError,
      );
    });

    it('throws when missing', async () => {
      await expect(service.update(99_999, { name: 'X' })).rejects.toBeInstanceOf(
        SeatLayoutNotFoundError,
      );
    });
  });

  describe('delete safeguard', () => {
    it('deletes when not referenced by any vehicle', async () => {
      const created = await service.create({ name: 'X', rows: 2, cols: 2, seats: validSeats });
      await service.delete(created.id);
      await expect(service.getById(created.id)).rejects.toBeInstanceOf(SeatLayoutNotFoundError);
    });

    it('throws SeatLayoutInUseError when referenced by a vehicle', async () => {
      setup({ isReferencedByVehicle: () => true });
      const created = await service.create({ name: 'X', rows: 2, cols: 2, seats: validSeats });
      await expect(service.delete(created.id)).rejects.toBeInstanceOf(SeatLayoutInUseError);
    });

    it('throws when layout missing', async () => {
      await expect(service.delete(99_999)).rejects.toBeInstanceOf(SeatLayoutNotFoundError);
    });
  });
});
