import { Route } from '@/modules/routes/domain/entities/route.entity';
import {
  CreateRouteInput,
  IRoutesRepository,
  RouteListFilter,
  UpdateRouteInput,
} from '@/modules/routes/domain/interfaces/routes.repository';

export function makeFakeRoutesRepository(): IRoutesRepository {
  const rows = new Map<number, Route>();
  let nextId = 1;

  return {
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async list(filter: RouteListFilter) {
      let out = [...rows.values()];
      if (filter.companyId !== undefined) {
        out = out.filter((r) => r.companyId === filter.companyId);
      }
      if (filter.fromStationId !== undefined) {
        out = out.filter((r) => r.fromStationId === filter.fromStationId);
      }
      if (filter.toStationId !== undefined) {
        out = out.filter((r) => r.toStationId === filter.toStationId);
      }
      return out.sort((a, b) => a.id - b.id);
    },
    async create(input: CreateRouteInput) {
      const r: Route = { id: nextId++, ...input };
      rows.set(r.id, r);
      return r;
    },
    async update(id: number, input: UpdateRouteInput) {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: Route = {
        ...existing,
        ...(input.distanceKm !== undefined && { distanceKm: input.distanceKm }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
      };
      rows.set(id, updated);
      return updated;
    },
    async delete(id: number) {
      rows.delete(id);
    },
  } satisfies IRoutesRepository;
}
