import { Route } from '../../domain/entities/route.entity';
import {
  IRoutesRepository,
  CreateRouteInput,
  RouteListFilter,
  UpdateRouteInput,
} from '../../domain/interfaces/routes.repository';

import { RouteModel } from '@/generated/prisma/models/Route';
import { DatabaseService } from '@/modules/database/database.service';

export class RoutesRepositoryPrisma extends IRoutesRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: RouteModel): Route {
    return {
      id: row.id,
      companyId: row.companyId,
      fromStationId: row.fromStationId,
      toStationId: row.toStationId,
      distanceKm: row.distanceKm,
      durationMinutes: row.durationMinutes,
    };
  }

  async findById(id: number): Promise<Route | null> {
    const row = await this.db.route.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: RouteListFilter): Promise<Route[]> {
    const rows = await this.db.route.findMany({
      where: {
        ...(filter.companyId !== undefined && { companyId: filter.companyId }),
        ...(filter.fromStationId !== undefined && { fromStationId: filter.fromStationId }),
        ...(filter.toStationId !== undefined && { toStationId: filter.toStationId }),
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(input: CreateRouteInput): Promise<Route> {
    const row = await this.db.route.create({ data: input });
    return this.toEntity(row);
  }

  async update(id: number, input: UpdateRouteInput): Promise<Route> {
    const row = await this.db.route.update({
      where: { id },
      data: {
        ...(input.distanceKm !== undefined && { distanceKm: input.distanceKm }),
        ...(input.durationMinutes !== undefined && { durationMinutes: input.durationMinutes }),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.route.delete({ where: { id } });
  }
}
