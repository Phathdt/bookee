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

export abstract class ITripsService {
  abstract list(filter: TripListFilter): Promise<Trip[]>;
  abstract getById(id: number): Promise<Trip>;
  abstract create(input: CreateTripInput, actor: ActorContext): Promise<Trip>;
  abstract createBulk(input: BulkCreateTripsInput, actor: ActorContext): Promise<Trip[]>;
  abstract setStatus(id: number, status: TripStatus, actor: ActorContext): Promise<Trip>;
}
