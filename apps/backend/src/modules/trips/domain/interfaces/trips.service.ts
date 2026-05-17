import { TripSearchPage } from '../entities/trip-search-result.entity';
import { Trip } from '../entities/trip.entity';
import { TripStatus } from '../enums';
import { CreateTripInput, TripListFilter } from './trips.repository';

export interface ActorContext {
  actorOperatorId: number | null;
}

export interface BulkCreateTripsInput {
  routeId: number;
  vehicleId: number;
  basePrice: number;
  dateRange: { start: string; end: string };
  dailyDepartureTime: string;
  tripDurationMinutes: number;
}

export interface TripSearchInput {
  from: string;
  to: string;
  /** YYYY-MM-DD in UTC */
  date: string;
  operatorIds?: number[];
  vehicleType?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: 'departureTime' | 'price' | 'duration';
  limit?: number;
  /** Opaque base64url cursor from a previous page response */
  cursor?: string;
}

export abstract class ITripsService {
  abstract list(filter: TripListFilter): Promise<Trip[]>;
  abstract getById(id: number): Promise<Trip>;
  abstract create(input: CreateTripInput, actor: ActorContext): Promise<Trip>;
  abstract createBulk(input: BulkCreateTripsInput, actor: ActorContext): Promise<Trip[]>;
  abstract setStatus(id: number, status: TripStatus, actor: ActorContext): Promise<Trip>;
  /** Public search — no ActorContext required. */
  abstract search(input: TripSearchInput): Promise<TripSearchPage>;
}
