import { Vehicle } from '../../domain/entities/vehicle.entity';
import {
  CreateVehicleInput,
  IVehiclesRepository,
  UpdateVehicleInput,
  VehicleListFilter,
} from '../../domain/interfaces/vehicles.repository';

import { VehicleModel } from '@/generated/prisma/models/Vehicle';
import { DatabaseService } from '@/modules/database/database.service';

export class VehiclesRepositoryPrisma extends IVehiclesRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: VehicleModel): Vehicle {
    return {
      id: row.id,
      companyId: row.companyId,
      plateNumber: row.plateNumber,
      type: row.type,
      seatLayoutId: row.seatLayoutId,
      totalSeats: row.totalSeats,
    };
  }

  async findById(id: number): Promise<Vehicle | null> {
    const row = await this.db.vehicle.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
    const row = await this.db.vehicle.findUnique({ where: { plateNumber } });
    return row ? this.toEntity(row) : null;
  }

  async list(filter: VehicleListFilter): Promise<Vehicle[]> {
    const rows = await this.db.vehicle.findMany({
      where: {
        ...(filter.companyId !== undefined && { companyId: filter.companyId }),
        ...(filter.type !== undefined && { type: filter.type }),
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    const row = await this.db.vehicle.create({ data: input });
    return this.toEntity(row);
  }

  async update(id: number, input: UpdateVehicleInput): Promise<Vehicle> {
    const row = await this.db.vehicle.update({
      where: { id },
      data: {
        ...(input.plateNumber !== undefined && { plateNumber: input.plateNumber }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.seatLayoutId !== undefined && { seatLayoutId: input.seatLayoutId }),
        ...(input.totalSeats !== undefined && { totalSeats: input.totalSeats }),
      },
    });
    return this.toEntity(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.vehicle.delete({ where: { id } });
  }

  /**
   * Stub — Trip module not built yet (Section 7).
   * Returns false so vehicles can always be deleted until trips exist.
   * Section 7 will flip this to query db.trip for active trips.
   */
  async hasActiveTrips(_vehicleId: number): Promise<boolean> {
    return false;
  }
}
