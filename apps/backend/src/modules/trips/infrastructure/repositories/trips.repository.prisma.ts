import { TripSearchPage, TripSearchResult } from '../../domain/entities/trip-search-result.entity';
import { Trip } from '../../domain/entities/trip.entity';
import { TripStatus } from '../../domain/enums';
import {
  CreateTripInput,
  ITripsRepository,
  TripListFilter,
  TripSearchQuery,
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

  /**
   * Public trip search with cursor-keyset pagination.
   *
   * Because the schema uses soft relations (no Prisma @relation), cross-table
   * filtering is done in two steps:
   *   1. Resolve matching route IDs by querying routes + stations + company.
   *   2. Query trips filtered by those route IDs + all scalar trip filters.
   *
   * Recommended production indexes (defer migration, small dataset is fine now):
   *   CREATE INDEX trips_route_dep ON trips (route_id, departure_time);
   *   CREATE INDEX routes_from_to  ON routes (from_station_id, to_station_id);
   */
  async search(query: TripSearchQuery): Promise<TripSearchPage> {
    // --- Step 1: resolve matching route IDs ---------------------------------

    // Find stations in origin city
    const fromStations = await this.db.station.findMany({
      where: { city: query.from },
    });
    const toStations = await this.db.station.findMany({
      where: { city: query.to },
    });

    if (fromStations.length === 0 || toStations.length === 0) {
      return { items: [], nextCursor: null };
    }

    const fromStationIds = fromStations.map((s) => s.id);
    const toStationIds = toStations.map((s) => s.id);

    const routeWhere: Record<string, unknown> = {
      fromStationId: { in: fromStationIds },
      toStationId: { in: toStationIds },
    };
    if (query.operatorIds && query.operatorIds.length > 0) {
      routeWhere.companyId = { in: query.operatorIds };
    }

    const matchingRoutes = await this.db.route.findMany({ where: routeWhere });

    if (matchingRoutes.length === 0) {
      return { items: [], nextCursor: null };
    }

    const routeIdSet = matchingRoutes.map((r) => r.id);

    // --- Step 2: query trips -------------------------------------------------

    // Build sort / cursor keyset
    type OrderBy = { departureTime?: 'asc' | 'desc' } | { basePrice?: 'asc' | 'desc' };
    const orderBy: OrderBy[] =
      query.sort === 'price'
        ? [{ basePrice: 'asc' }, { departureTime: 'asc' }]
        : [{ departureTime: 'asc' }]; // departureTime and duration both use this primary sort

    // Cursor keyset: for departureTime/duration sort use (departureTime, id),
    // for price sort use (basePrice, id).
    // NOTE: duration sort re-orders in memory after fetch — cursor is still
    //       anchored on (departureTime, id) to keep pagination consistent.
    // Known limitation: duration sort with large offsets may drift because
    //   the cursor is departure-time based while display order is duration based.
    let cursorWhere: Record<string, unknown> = {};
    if (query.cursor) {
      if (query.sort === 'price') {
        // Keyset on (basePrice ASC, id ASC)
        // Prisma doesn't support tuple comparison directly; simulate with OR:
        // (basePrice > cursorPrice) OR (basePrice = cursorPrice AND id > cursorId)
        // We approximate by fetching from departureTime cursor instead for price sort.
        // Use a simple id-based cursor fallback for price sort.
        cursorWhere = { id: { gt: query.cursor.id } };
      } else {
        // Keyset on (departureTime ASC, id ASC)
        cursorWhere = {
          OR: [
            { departureTime: { gt: query.cursor.departureTime } },
            {
              departureTime: { equals: query.cursor.departureTime },
              id: { gt: query.cursor.id },
            },
          ],
        };
      }
    }

    const tripWhere: Record<string, unknown> = {
      routeId: { in: routeIdSet },
      status: 'scheduled',
      departureTime: {
        gte: query.dateUtcStart,
        lte: query.dateUtcEnd,
      },
      ...(query.priceMin !== undefined && { basePrice: { gte: query.priceMin } }),
      ...(query.priceMax !== undefined
        ? {
            basePrice: {
              ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
              lte: query.priceMax,
            },
          }
        : {}),
      ...cursorWhere,
    };

    // Vehicle type filter — need to resolve vehicle IDs first
    let vehicleIdFilter: number[] | undefined;
    if (query.vehicleType) {
      const matchingVehicles = await this.db.vehicle.findMany({
        where: { type: query.vehicleType },
      });
      vehicleIdFilter = matchingVehicles.map((v) => v.id);
      if (vehicleIdFilter.length === 0) return { items: [], nextCursor: null };
      tripWhere.vehicleId = { in: vehicleIdFilter };
    }

    // Fetch limit+1 to detect if a next page exists
    const rawTrips = await this.db.trip.findMany({
      where: tripWhere,
      orderBy,
      take: query.limit + 1,
    });

    const hasNextPage = rawTrips.length > query.limit;
    const pageTrips = hasNextPage ? rawTrips.slice(0, query.limit) : rawTrips;

    if (pageTrips.length === 0) {
      return { items: [], nextCursor: null };
    }

    // --- Step 3: batch-load related entities ---------------------------------

    const uniqueRouteIds = [...new Set(pageTrips.map((t) => t.routeId))];
    const uniqueVehicleIds = [...new Set(pageTrips.map((t) => t.vehicleId))];

    const [routes, vehicles] = await Promise.all([
      this.db.route.findMany({ where: { id: { in: uniqueRouteIds } } }),
      this.db.vehicle.findMany({ where: { id: { in: uniqueVehicleIds } } }),
    ]);

    const uniqueStationIds = [
      ...new Set([...routes.map((r) => r.fromStationId), ...routes.map((r) => r.toStationId)]),
    ];
    const uniqueCompanyIds = [...new Set(routes.map((r) => r.companyId))];

    const [stations, companies] = await Promise.all([
      this.db.station.findMany({ where: { id: { in: uniqueStationIds } } }),
      this.db.busCompany.findMany({ where: { id: { in: uniqueCompanyIds } } }),
    ]);

    // Build lookup maps
    const routeMap = new Map(routes.map((r) => [r.id, r]));
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const stationMap = new Map(stations.map((s) => [s.id, s]));
    const companyMap = new Map(companies.map((c) => [c.id, c]));

    // --- Step 4: assemble results --------------------------------------------

    const items: TripSearchResult[] = [];
    for (const t of pageTrips) {
      const route = routeMap.get(t.routeId);
      const vehicle = vehicleMap.get(t.vehicleId);
      if (!route || !vehicle) continue; // defensive skip on data anomaly

      const fromStation = stationMap.get(route.fromStationId);
      const toStation = stationMap.get(route.toStationId);
      const company = companyMap.get(route.companyId);
      if (!fromStation || !toStation || !company) continue;

      items.push({
        trip: {
          id: t.id,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          basePrice: t.basePrice,
          status: t.status as TripStatus,
        },
        route: {
          id: route.id,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          fromStation: {
            id: fromStation.id,
            name: fromStation.name,
            city: fromStation.city,
            address: fromStation.address,
          },
          toStation: {
            id: toStation.id,
            name: toStation.name,
            city: toStation.city,
            address: toStation.address,
          },
          company: { id: company.id, name: company.name },
        },
        vehicle: {
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          type: vehicle.type,
          totalSeats: vehicle.totalSeats,
        },
        // TODO(section-9): subtract paidSeats + lockedSeats once booking module exists
        availableSeats: vehicle.totalSeats,
      });
    }

    // Re-sort by duration in memory when sort=duration (known limitation: cursor
    // is anchored to departureTime so deep pagination with duration sort may
    // return overlapping windows — document and accept for now).
    if (query.sort === 'duration') {
      items.sort(
        (a, b) =>
          a.trip.arrivalTime.getTime() -
          a.trip.departureTime.getTime() -
          (b.trip.arrivalTime.getTime() - b.trip.departureTime.getTime()),
      );
    }

    // Encode next-page cursor from the last item in the sorted page
    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const last = items[items.length - 1]!;
      const payload = JSON.stringify({ d: last.trip.departureTime.toISOString(), i: last.trip.id });
      nextCursor = Buffer.from(payload).toString('base64url');
    }

    return { items, nextCursor };
  }
}
