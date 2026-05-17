export { TripsModule } from './trips.module';
export { TripsService } from './application/services/trips.service';
export { ITripsService } from './domain/interfaces/trips.service';
export { ITripsRepository } from './domain/interfaces/trips.repository';
export type {
  CreateTripInput,
  TripListFilter,
  TripSearchQuery,
} from './domain/interfaces/trips.repository';
export type {
  ActorContext,
  BulkCreateTripsInput,
  TripSearchInput,
} from './domain/interfaces/trips.service';
export type { Trip } from './domain/entities/trip.entity';
export type { TripSearchResult, TripSearchPage } from './domain/entities/trip-search-result.entity';
export { TRIP_STATUSES, isTripStatus } from './domain/enums';
export type { TripStatus } from './domain/enums';
export {
  TripNotFoundError,
  TripForbiddenError,
  TripValidationError,
  TripConflictError,
  TripInvalidTransitionError,
} from './domain/errors';
