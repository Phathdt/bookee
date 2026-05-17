import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeStationsRepository } from '../../../../../test/factories/stations-repository.fake';
import {
  StationInUseError,
  StationNotFoundError,
  StationValidationError,
} from '../../domain/errors';
import { IStationsRepository } from '../../domain/interfaces/stations.repository';

import { StationsService } from './stations.service';

describe('StationsService', () => {
  let stations: IStationsRepository;
  let service: StationsService;

  function setup(opts: { isReferencedByRoute?: (id: number) => boolean } = {}): void {
    stations = makeFakeStationsRepository(opts);
    service = new StationsService(stations);
  }

  beforeEach(() => setup());

  describe('create', () => {
    it('persists a valid station', async () => {
      const s = await service.create({
        name: 'Bến A',
        address: '1 Đường ABC',
        lat: 10.8,
        lng: 106.7,
        city: 'TP.HCM',
      });
      expect(s.id).toBe(1);
      expect(s.name).toBe('Bến A');
    });

    it('rejects lat out of range', async () => {
      await expect(
        service.create({ name: 'X', address: 'a', lat: 200, lng: 0, city: 'X' }),
      ).rejects.toBeInstanceOf(StationValidationError);
    });

    it('rejects lng out of range', async () => {
      await expect(
        service.create({ name: 'X', address: 'a', lat: 0, lng: -181, city: 'X' }),
      ).rejects.toBeInstanceOf(StationValidationError);
    });
  });

  describe('update', () => {
    it('updates name', async () => {
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      const updated = await service.update(s.id, { name: 'A renamed' });
      expect(updated.name).toBe('A renamed');
    });

    it('rejects lat out of range on update', async () => {
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      await expect(service.update(s.id, { lat: 91 })).rejects.toBeInstanceOf(
        StationValidationError,
      );
    });

    it('rejects lng out of range on update', async () => {
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      await expect(service.update(s.id, { lng: 999 })).rejects.toBeInstanceOf(
        StationValidationError,
      );
    });

    it('throws when station missing', async () => {
      await expect(service.update(99_999, { name: 'X' })).rejects.toBeInstanceOf(
        StationNotFoundError,
      );
    });
  });

  describe('getById', () => {
    it('returns existing station', async () => {
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      expect((await service.getById(s.id)).id).toBe(s.id);
    });

    it('throws when station missing', async () => {
      await expect(service.getById(99_999)).rejects.toBeInstanceOf(StationNotFoundError);
    });
  });

  describe('list / search', () => {
    beforeEach(async () => {
      await service.create({
        name: 'Bến xe Miền Đông',
        address: '',
        lat: 10.8,
        lng: 106.8,
        city: 'TP.HCM',
      });
      await service.create({
        name: 'Bến xe Đà Lạt',
        address: '',
        lat: 11.9,
        lng: 108.4,
        city: 'Lâm Đồng',
      });
      await service.create({
        name: 'Bến xe Cần Thơ',
        address: '',
        lat: 10.0,
        lng: 105.7,
        city: 'Cần Thơ',
      });
    });

    it('returns all without filter', async () => {
      expect((await service.list({})).length).toBe(3);
    });

    it('filters by city', async () => {
      const r = await service.list({ city: 'TP.HCM' });
      expect(r.map((s) => s.name)).toEqual(['Bến xe Miền Đông']);
    });

    it('diacritic-insensitive search matches "da lat"', async () => {
      const r = await service.list({ q: 'da lat' });
      expect(r.map((s) => s.name)).toContain('Bến xe Đà Lạt');
    });

    it('diacritic-insensitive search matches "MIEN DONG"', async () => {
      const r = await service.list({ q: 'MIEN DONG' });
      expect(r.map((s) => s.name)).toContain('Bến xe Miền Đông');
    });
  });

  describe('delete safeguard', () => {
    it('deletes when no routes reference it', async () => {
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      await service.delete(s.id);
      await expect(service.getById(s.id)).rejects.toBeInstanceOf(StationNotFoundError);
    });

    it('throws StationInUseError when routes reference it', async () => {
      setup({ isReferencedByRoute: () => true });
      const s = await service.create({ name: 'A', address: 'a', lat: 0, lng: 0, city: 'X' });
      await expect(service.delete(s.id)).rejects.toBeInstanceOf(StationInUseError);
    });

    it('throws when station missing', async () => {
      await expect(service.delete(99_999)).rejects.toBeInstanceOf(StationNotFoundError);
    });
  });
});
