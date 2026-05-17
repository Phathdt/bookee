import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/enums';
import {
  CreateTripInput,
  ITripsRepository,
  TripListFilter,
} from '../../domain/interfaces/trips.repository';

import { TripModel } from '@/generated/prisma/models/Trip';
import { DatabaseService } from '@/modules/database/database.service';

export class TripsRepositoryPrisma extends ITripsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: TripModel): Trip {
    return {
      id: row.id,
      routeId: row.routeId,
      vehicleId: row.vehicleId,
      departureTime: row.departureTime,
      arrivalTime: row.arrivalTime,
      basePrice: row.basePrice,
      status: row.status as TripStatus,
    };
  }

  async findById(id: number): Promise<Trip | null> {
    const row = await this.db.trip.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: TripListFilter): Promise<Trip[]> {
    const rows = await this.db.trip.findMany({
      where: {
        ...(filter.vehicleId !== undefined && { vehicleId: filter.vehicleId }),
        ...(filter.routeId !== undefined && { routeId: filter.routeId }),
        ...(filter.status !== undefined && { status: filter.status }),
        ...(filter.companyId !== undefined && {
          route: { companyId: filter.companyId },
        }),
        ...(filter.from !== undefined || filter.to !== undefined
          ? {
              departureTime: {
                ...(filter.from !== undefined && { gte: filter.from }),
                ...(filter.to !== undefined && { lte: filter.to }),
              },
            }
          : {}),
      },
      orderBy: { departureTime: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async listConflictsForVehicle(
    vehicleId: number,
    from: Date,
    to: Date,
    excludeTripId?: number,
  ): Promise<Trip[]> {
    const rows = await this.db.trip.findMany({
      where: {
        vehicleId,
        status: { not: 'cancelled' },
        departureTime: { lt: to },
        arrivalTime: { gt: from },
        ...(excludeTripId !== undefined && { id: { not: excludeTripId } }),
      },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(input: CreateTripInput): Promise<Trip> {
    const row = await this.db.trip.create({
      data: {
        routeId: input.routeId,
        vehicleId: input.vehicleId,
        departureTime: input.departureTime,
        arrivalTime: input.arrivalTime,
        basePrice: input.basePrice,
        status: input.status ?? 'scheduled',
      },
    });
    return this.toEntity(row);
  }

  async createMany(inputs: CreateTripInput[]): Promise<Trip[]> {
    const rows = await this.db.$transaction(
      inputs.map((input) =>
        this.db.trip.create({
          data: {
            routeId: input.routeId,
            vehicleId: input.vehicleId,
            departureTime: input.departureTime,
            arrivalTime: input.arrivalTime,
            basePrice: input.basePrice,
            status: input.status ?? 'scheduled',
          },
        }),
      ),
    );
    return rows.map((r) => this.toEntity(r));
  }

  async updateStatus(id: number, status: TripStatus): Promise<Trip> {
    const row = await this.db.trip.update({
      where: { id },
      data: { status },
    });
    return this.toEntity(row);
  }

  async hasActiveTrips(vehicleId: number): Promise<boolean> {
    const count = await this.db.trip.count({
      where: {
        vehicleId,
        status: { in: ['scheduled', 'in_progress'] },
      },
    });
    return count > 0;
  }
}
