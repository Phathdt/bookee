import { Trip } from '../entities/trip.entity';
import { TripStatus } from '../enums';

export interface CreateTripInput {
  routeId: number;
  vehicleId: number;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  status?: TripStatus;
}

export interface TripListFilter {
  companyId?: number;
  vehicleId?: number;
  routeId?: number;
  status?: TripStatus;
  from?: Date;
  to?: Date;
}

export abstract class ITripsRepository {
  abstract findById(id: number): Promise<Trip | null>;
  abstract list(filter: TripListFilter): Promise<Trip[]>;
  abstract listConflictsForVehicle(
    vehicleId: number,
    from: Date,
    to: Date,
    excludeTripId?: number,
  ): Promise<Trip[]>;
  abstract create(input: CreateTripInput): Promise<Trip>;
  abstract createMany(inputs: CreateTripInput[]): Promise<Trip[]>;
  abstract updateStatus(id: number, status: TripStatus): Promise<Trip>;
  abstract hasActiveTrips(vehicleId: number): Promise<boolean>;
}
