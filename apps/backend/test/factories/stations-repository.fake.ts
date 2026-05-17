import { Station } from '@/modules/stations/domain/entities/station.entity';
import {
  CreateStationInput,
  IStationsRepository,
  StationSearchFilter,
  UpdateStationInput,
} from '@/modules/stations/domain/interfaces/stations.repository';
import { normalizeVietnamese } from '@/modules/stations/domain/normalize-vietnamese';

export function makeFakeStationsRepository(
  options: {
    isReferencedByRoute?: (id: number) => boolean;
  } = {},
): IStationsRepository {
  const rows = new Map<number, Station>();
  let nextId = 1;

  return {
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async list(filter: StationSearchFilter) {
      let out = [...rows.values()];
      if (filter.city) {
        const c = filter.city.toLowerCase();
        out = out.filter((r) => r.city.toLowerCase().includes(c));
      }
      if (filter.q) {
        const q = normalizeVietnamese(filter.q);
        out = out.filter((r) => normalizeVietnamese(r.name).includes(q));
      }
      return out.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    },
    async create(input: CreateStationInput) {
      const s: Station = { id: nextId++, ...input };
      rows.set(s.id, s);
      return s;
    },
    async update(id: number, input: UpdateStationInput) {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: Station = {
        ...existing,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.lat !== undefined && { lat: input.lat }),
        ...(input.lng !== undefined && { lng: input.lng }),
        ...(input.city !== undefined && { city: input.city }),
      };
      rows.set(id, updated);
      return updated;
    },
    async delete(id: number) {
      rows.delete(id);
    },
    async isReferencedByRoute(id: number) {
      return options.isReferencedByRoute?.(id) ?? false;
    },
  } satisfies IStationsRepository;
}
