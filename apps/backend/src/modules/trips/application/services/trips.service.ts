import { TripSearchPage } from '../../domain/entities/trip-search-result.entity';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/enums';
import {
  TripConflictError,
  TripForbiddenError,
  TripInvalidTransitionError,
  TripNotFoundError,
  TripValidationError,
} from '../../domain/errors';
import {
  ActorContext,
  BulkCreateTripsInput,
  ITripsService,
  TripSearchInput,
} from '../../domain/interfaces/trips.service';
import {
  CreateTripInput,
  ITripsRepository,
  TripListFilter,
} from '../../domain/interfaces/trips.repository';
import { canTransition } from '../../domain/state-machine';

import { IRoutesRepository } from '@/modules/routes/domain/interfaces/routes.repository';
import { IVehiclesRepository } from '@/modules/vehicles/domain/interfaces/vehicles.repository';

export class TripsService implements ITripsService {
  constructor(
    private readonly trips: ITripsRepository,
    private readonly routes: IRoutesRepository,
    private readonly vehicles: IVehiclesRepository,
  ) {}

  private assertOperatorScope(companyId: number, actor: ActorContext): void {
    if (actor.actorOperatorId !== null && actor.actorOperatorId !== companyId) {
      throw new TripForbiddenError();
    }
  }

  private async assertOwnershipAndScope(
    routeId: number,
    vehicleId: number,
    actor: ActorContext,
  ): Promise<void> {
    const route = await this.routes.findById(routeId);
    if (!route) {
      throw new TripValidationError(`Route ${routeId} not found`);
    }

    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle) {
      throw new TripValidationError(`Vehicle ${vehicleId} not found`);
    }

    if (route.companyId !== vehicle.companyId) {
      throw new TripValidationError('Route and vehicle must belong to the same operator');
    }

    this.assertOperatorScope(route.companyId, actor);
  }

  private assertTimeOrder(departureTime: Date, arrivalTime: Date): void {
    if (departureTime >= arrivalTime) {
      throw new TripValidationError('departureTime must be before arrivalTime');
    }
  }

  private async assertNoVehicleConflict(
    vehicleId: number,
    departureTime: Date,
    arrivalTime: Date,
    excludeTripId?: number,
  ): Promise<void> {
    const conflicts = await this.trips.listConflictsForVehicle(
      vehicleId,
      departureTime,
      arrivalTime,
      excludeTripId,
    );
    if (conflicts.length > 0) {
      throw new TripConflictError();
    }
  }

  list(filter: TripListFilter): Promise<Trip[]> {
    return this.trips.list(filter);
  }

  async getById(id: number): Promise<Trip> {
    const trip = await this.trips.findById(id);
    if (!trip) throw new TripNotFoundError();
    return trip;
  }

  async create(input: CreateTripInput, actor: ActorContext): Promise<Trip> {
    this.assertTimeOrder(input.departureTime, input.arrivalTime);
    await this.assertOwnershipAndScope(input.routeId, input.vehicleId, actor);
    await this.assertNoVehicleConflict(input.vehicleId, input.departureTime, input.arrivalTime);
    return this.trips.create(input);
  }

  async createBulk(input: BulkCreateTripsInput, actor: ActorContext): Promise<Trip[]> {
    await this.assertOwnershipAndScope(input.routeId, input.vehicleId, actor);

    const startParts = input.dateRange.start.split('-').map(Number);
    const endParts = input.dateRange.end.split('-').map(Number);
    // Use UTC midnight so cursor arithmetic is timezone-independent
    const startDate = new Date(Date.UTC(startParts[0]!, startParts[1]! - 1, startParts[2]!));
    const endDate = new Date(Date.UTC(endParts[0]!, endParts[1]! - 1, endParts[2]!));

    if (startDate > endDate) {
      throw new TripValidationError('dateRange.start must be <= dateRange.end');
    }

    const timeParts = input.dailyDepartureTime.split(':').map(Number);
    const hh = timeParts[0]!;
    const mm = timeParts[1]!;

    const tripInputs: CreateTripInput[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const departure = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), hh, mm, 0, 0),
      );
      const arrival = new Date(departure.getTime() + input.tripDurationMinutes * 60_000);

      this.assertTimeOrder(departure, arrival);

      tripInputs.push({
        routeId: input.routeId,
        vehicleId: input.vehicleId,
        basePrice: input.basePrice,
        departureTime: departure,
        arrivalTime: arrival,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (tripInputs.length === 0) {
      throw new TripValidationError('Date range produced no trips');
    }

    // Check pairwise overlaps within the batch itself (sorted by departure)
    const sorted = [...tripInputs].sort(
      (a, b) => a.departureTime.getTime() - b.departureTime.getTime(),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      if (a.departureTime < b.arrivalTime && a.arrivalTime > b.departureTime) {
        throw new TripConflictError(
          'Trips within the bulk batch overlap each other on the same vehicle',
        );
      }
    }

    // Check each trip against existing trips in the DB
    for (const t of tripInputs) {
      await this.assertNoVehicleConflict(t.vehicleId, t.departureTime, t.arrivalTime);
    }

    return this.trips.createMany(tripInputs);
  }

  async setStatus(id: number, status: TripStatus, actor: ActorContext): Promise<Trip> {
    const trip = await this.trips.findById(id);
    if (!trip) throw new TripNotFoundError();

    // Scope check: load route to get companyId
    const route = await this.routes.findById(trip.routeId);
    if (route) {
      this.assertOperatorScope(route.companyId, actor);
    }

    if (!canTransition(trip.status, status)) {
      throw new TripInvalidTransitionError(trip.status, status);
    }

    return this.trips.updateStatus(id, status);
  }

  async search(input: TripSearchInput): Promise<TripSearchPage> {
    if (!input.from || !input.to || !input.date) {
      throw new TripValidationError('from, to, and date are required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new TripValidationError('date must be YYYY-MM-DD');
    }

    const dateUtcStart = new Date(`${input.date}T00:00:00.000Z`);
    const dateUtcEnd = new Date(`${input.date}T23:59:59.999Z`);

    if (isNaN(dateUtcStart.getTime())) {
      throw new TripValidationError('date is not a valid calendar date');
    }

    const sort = input.sort ?? 'departureTime';
    const limit = Math.min(input.limit ?? 20, 50);

    // Decode the incoming opaque cursor into structured form.
    let parsedCursor: { departureTime: Date; id: number } | null = null;
    if (input.cursor) {
      try {
        const raw = Buffer.from(input.cursor, 'base64url').toString('utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('d' in parsed) ||
          !('i' in parsed) ||
          typeof (parsed as { d: unknown }).d !== 'string' ||
          typeof (parsed as { i: unknown }).i !== 'number'
        ) {
          throw new TripValidationError('cursor is malformed');
        }
        const obj = parsed as { d: string; i: number };
        const dt = new Date(obj.d);
        if (isNaN(dt.getTime())) throw new TripValidationError('cursor departureTime is invalid');
        parsedCursor = { departureTime: dt, id: obj.i };
      } catch (err) {
        if (err instanceof TripValidationError) throw err;
        throw new TripValidationError('cursor is malformed');
      }
    }

    return this.trips.search({
      from: input.from,
      to: input.to,
      dateUtcStart,
      dateUtcEnd,
      operatorIds: input.operatorIds,
      vehicleType: input.vehicleType,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      sort,
      limit,
      cursor: parsedCursor,
    });
  }
}
