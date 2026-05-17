import { Station } from '../../domain/entities/station.entity';
import {
  IStationsRepository,
  CreateStationInput,
  StationSearchFilter,
  UpdateStationInput,
} from '../../domain/interfaces/stations.repository';
import { normalizeVietnamese } from '../../domain/normalize-vietnamese';

import { StationModel } from '@/generated/prisma/models/Station';
import { DatabaseService } from '@/modules/database/database.service';

export class StationsRepositoryPrisma extends IStationsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: StationModel): Station {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      city: row.city,
    };
  }

  async findById(id: number): Promise<Station | null> {
    const row = await this.db.station.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: StationSearchFilter): Promise<Station[]> {
    const rows = await this.db.station.findMany({
      where: filter.city ? { city: { contains: filter.city, mode: 'insensitive' } } : undefined,
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });

    if (!filter.q) return rows.map((r) => this.toEntity(r));

    // Diacritic-insensitive substring match handled in app code — Postgres
    // would need the `unaccent` extension to do this natively. For Bookee's
    // size (a few hundred stations max) the small post-filter is cheap.
    const needle = normalizeVietnamese(filter.q);
    return rows
      .filter((r) => normalizeVietnamese(r.name).includes(needle))
      .map((r) => this.toEntity(r));
  }

  async create(input: CreateStationInput): Promise<Station> {
    const row = await this.db.station.create({ data: input });
    return this.toEntity(row);
  }

  async update(id: number, input: UpdateStationInput): Promise<Station> {
    const row = await this.db.station.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.lat !== undefined && { lat: input.lat }),
        ...(input.lng !== undefined && { lng: input.lng }),
        ...(input.city !== undefined && { city: input.city }),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.station.delete({ where: { id } });
  }

  async isReferencedByRoute(id: number): Promise<boolean> {
    const count = await this.db.route.count({
      where: { OR: [{ fromStationId: id }, { toStationId: id }] },
    });
    return count > 0;
  }
}
