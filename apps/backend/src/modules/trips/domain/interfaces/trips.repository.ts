import { TripSearchPage, TripSearchResult } from '../entities/trip-search-result.entity';
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

export interface TripSearchQuery {
  /** Origin city name (exact match on station.city) */
  from: string;
  /** Destination city name (exact match on station.city) */
  to: string;
  /** UTC start of the requested travel day (00:00:00.000Z) */
  dateUtcStart: Date;
  /** UTC end of the requested travel day (23:59:59.999Z) */
  dateUtcEnd: Date;
  operatorIds?: number[];
  vehicleType?: string;
  priceMin?: number;
  priceMax?: number;
  sort: 'departureTime' | 'price' | 'duration';
  limit: number;
  cursor: { departureTime: Date; id: number } | null;
}

// Re-export so callers don't need to import from the entity file directly.
export type { TripSearchResult, TripSearchPage };

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
  abstract search(query: TripSearchQuery): Promise<TripSearchPage>;
}
