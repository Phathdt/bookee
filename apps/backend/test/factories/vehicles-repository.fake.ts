import { Vehicle } from '@/modules/vehicles/domain/entities/vehicle.entity';
import {
  IVehiclesRepository,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleListFilter,
} from '@/modules/vehicles/domain/interfaces/vehicles.repository';

export function makeFakeVehiclesRepository(
  options: {
    hasActiveTrips?: (vehicleId: number) => boolean;
  } = {},
): IVehiclesRepository {
  const rows = new Map<number, Vehicle>();
  let nextId = 1;

  return {
    async findById(id: number): Promise<Vehicle | null> {
      return rows.get(id) ?? null;
    },

    async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
      for (const v of rows.values()) {
        if (v.plateNumber === plateNumber) return v;
      }
      return null;
    },

    async list(filter: VehicleListFilter): Promise<Vehicle[]> {
      let out = [...rows.values()];
      if (filter.companyId !== undefined) {
        out = out.filter((v) => v.companyId === filter.companyId);
      }
      if (filter.type !== undefined) {
        out = out.filter((v) => v.type === filter.type);
      }
      return out.sort((a, b) => a.id - b.id);
    },

    async create(input: CreateVehicleInput): Promise<Vehicle> {
      const v: Vehicle = { id: nextId++, ...input };
      rows.set(v.id, v);
      return v;
    },

    async update(id: number, input: UpdateVehicleInput): Promise<Vehicle> {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: Vehicle = {
        ...existing,
        ...(input.plateNumber !== undefined && { plateNumber: input.plateNumber }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.seatLayoutId !== undefined && { seatLayoutId: input.seatLayoutId }),
        ...(input.totalSeats !== undefined && { totalSeats: input.totalSeats }),
      };
      rows.set(id, updated);
      return updated;
    },

    async delete(id: number): Promise<void> {
      rows.delete(id);
    },

    async hasActiveTrips(vehicleId: number): Promise<boolean> {
      return options.hasActiveTrips?.(vehicleId) ?? false;
    },
  } satisfies IVehiclesRepository;
}
