import { Vehicle } from '../entities/vehicle.entity';

export interface CreateVehicleInput {
  companyId: number;
  plateNumber: string;
  type: string;
  seatLayoutId: number;
  totalSeats: number;
}

export interface UpdateVehicleInput {
  plateNumber?: string;
  type?: string;
  seatLayoutId?: number;
  totalSeats?: number;
}

export interface VehicleListFilter {
  companyId?: number;
  type?: string;
}

export abstract class IVehiclesRepository {
  abstract findById(id: number): Promise<Vehicle | null>;
  abstract findByPlateNumber(plateNumber: string): Promise<Vehicle | null>;
  abstract list(filter: VehicleListFilter): Promise<Vehicle[]>;
  abstract create(input: CreateVehicleInput): Promise<Vehicle>;
  abstract update(id: number, input: UpdateVehicleInput): Promise<Vehicle>;
  abstract delete(id: number): Promise<void>;
  /** Stub — returns false until Trip module is built in Section 7. */
  abstract hasActiveTrips(vehicleId: number): Promise<boolean>;
}
