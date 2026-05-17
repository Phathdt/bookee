import {
  TripSearchPage,
  TripSearchResult,
} from '@/modules/trips/domain/entities/trip-search-result.entity';
import { Trip } from '@/modules/trips/domain/entities/trip.entity';
import { TripStatus } from '@/modules/trips/domain/enums';
import {
  CreateTripInput,
  ITripsRepository,
  TripListFilter,
  TripSearchQuery,
} from '@/modules/trips/domain/interfaces/trips.repository';

/** Minimal route record needed by the fake search implementation. */
export interface FakeRoute {
  id: number;
  companyId: number;
  fromStationId: number;
  toStationId: number;
  distanceKm: number;
  durationMinutes: number;
}

/** Minimal station record needed by the fake search implementation. */
export interface FakeStation {
  id: number;
  name: string;
  city: string;
  address: string;
}

/** Minimal company record needed by the fake search implementation. */
export interface FakeCompany {
  id: number;
  name: string;
}

/** Minimal vehicle record needed by the fake search implementation. */
export interface FakeVehicle {
  id: number;
  plateNumber: string;
  type: string;
  totalSeats: number;
}

export interface FakeTripsRepositoryOptions {
  /** Pre-seeded routes for search. */
  routes?: FakeRoute[];
  /** Pre-seeded stations for search. */
  stations?: FakeStation[];
  /** Pre-seeded companies for search. */
  companies?: FakeCompany[];
  /** Pre-seeded vehicles for search. */
  vehicles?: FakeVehicle[];
}

export function makeFakeTripsRepository(
  options: FakeTripsRepositoryOptions = {},
): ITripsRepository {
  const rows = new Map<number, Trip>();
  let nextId = 1;

  // Mutable in-memory lookups for the search method
  const routes = new Map<number, FakeRoute>((options.routes ?? []).map((r) => [r.id, r]));
  const stations = new Map<number, FakeStation>((options.stations ?? []).map((s) => [s.id, s]));
  const companies = new Map<number, FakeCompany>((options.companies ?? []).map((c) => [c.id, c]));
  const vehicles = new Map<number, FakeVehicle>((options.vehicles ?? []).map((v) => [v.id, v]));

  return {
    async findById(id: number): Promise<Trip | null> {
      return rows.get(id) ?? null;
    },

    async list(filter: TripListFilter): Promise<Trip[]> {
      let out = [...rows.values()];
      if (filter.vehicleId !== undefined) {
        out = out.filter((t) => t.vehicleId === filter.vehicleId);
      }
      if (filter.routeId !== undefined) {
        out = out.filter((t) => t.routeId === filter.routeId);
      }
      if (filter.status !== undefined) {
        out = out.filter((t) => t.status === filter.status);
      }
      if (filter.from !== undefined) {
        out = out.filter((t) => t.departureTime >= filter.from!);
      }
      if (filter.to !== undefined) {
        out = out.filter((t) => t.departureTime <= filter.to!);
      }
      return out.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime());
    },

    async listConflictsForVehicle(
      vehicleId: number,
      from: Date,
      to: Date,
      excludeTripId?: number,
    ): Promise<Trip[]> {
      return [...rows.values()].filter(
        (t) =>
          t.vehicleId === vehicleId &&
          t.status !== 'cancelled' &&
          t.departureTime < to &&
          t.arrivalTime > from &&
          t.id !== excludeTripId,
      );
    },

    async create(input: CreateTripInput): Promise<Trip> {
      const trip: Trip = {
        id: nextId++,
        routeId: input.routeId,
        vehicleId: input.vehicleId,
        departureTime: input.departureTime,
        arrivalTime: input.arrivalTime,
        basePrice: input.basePrice,
        status: input.status ?? 'scheduled',
      };
      rows.set(trip.id, trip);
      return trip;
    },

    async createMany(inputs: CreateTripInput[]): Promise<Trip[]> {
      return Promise.all(
        inputs.map(async (input) => {
          const trip: Trip = {
            id: nextId++,
            routeId: input.routeId,
            vehicleId: input.vehicleId,
            departureTime: input.departureTime,
            arrivalTime: input.arrivalTime,
            basePrice: input.basePrice,
            status: input.status ?? 'scheduled',
          };
          rows.set(trip.id, trip);
          return trip;
        }),
      );
    },

    async updateStatus(id: number, status: TripStatus): Promise<Trip> {
      const existing = rows.get(id);
      if (!existing) throw new Error('Trip not found');
      const updated: Trip = { ...existing, status };
      rows.set(id, updated);
      return updated;
    },

    async hasActiveTrips(vehicleId: number): Promise<boolean> {
      return [...rows.values()].some(
        (t) =>
          t.vehicleId === vehicleId && (t.status === 'scheduled' || t.status === 'in_progress'),
      );
    },

    async search(query: TripSearchQuery): Promise<TripSearchPage> {
      // Resolve route IDs whose from-station.city == query.from and to-station.city == query.to
      const matchingRouteIds = new Set<number>();
      for (const route of routes.values()) {
        const from = stations.get(route.fromStationId);
        const to = stations.get(route.toStationId);
        if (!from || !to) continue;
        if (from.city !== query.from || to.city !== query.to) continue;
        if (query.operatorIds && query.operatorIds.length > 0) {
          if (!query.operatorIds.includes(route.companyId)) continue;
        }
        matchingRouteIds.add(route.id);
      }

      let out = [...rows.values()].filter((t) => {
        if (!matchingRouteIds.has(t.routeId)) return false;
        if (t.status !== 'scheduled') return false;
        if (t.departureTime < query.dateUtcStart || t.departureTime > query.dateUtcEnd)
          return false;
        if (query.priceMin !== undefined && t.basePrice < query.priceMin) return false;
        if (query.priceMax !== undefined && t.basePrice > query.priceMax) return false;
        if (query.vehicleType !== undefined) {
          const v = vehicles.get(t.vehicleId);
          if (!v || v.type !== query.vehicleType) return false;
        }
        return true;
      });

      // Apply cursor
      if (query.cursor) {
        const cursorDep = query.cursor.departureTime.getTime();
        const cursorId = query.cursor.id;
        out = out.filter(
          (t) =>
            t.departureTime.getTime() > cursorDep ||
            (t.departureTime.getTime() === cursorDep && t.id > cursorId),
        );
      }

      // Sort
      if (query.sort === 'price') {
        out.sort((a, b) => a.basePrice - b.basePrice || a.id - b.id);
      } else {
        out.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime() || a.id - b.id);
      }

      const hasNextPage = out.length > query.limit;
      const page = hasNextPage ? out.slice(0, query.limit) : out;

      // Assemble denormalized results
      const items: TripSearchResult[] = [];
      for (const t of page) {
        const route = routes.get(t.routeId);
        const vehicle = vehicles.get(t.vehicleId);
        if (!route || !vehicle) continue;
        const fromStation = stations.get(route.fromStationId);
        const toStation = stations.get(route.toStationId);
        const company = companies.get(route.companyId);
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

      // Re-sort by duration in memory if requested (matches Prisma repo behaviour)
      if (query.sort === 'duration') {
        items.sort(
          (a, b) =>
            a.trip.arrivalTime.getTime() -
            a.trip.departureTime.getTime() -
            (b.trip.arrivalTime.getTime() - b.trip.departureTime.getTime()),
        );
      }

      let nextCursor: string | null = null;
      if (hasNextPage && items.length > 0) {
        const last = items[items.length - 1]!;
        const payload = JSON.stringify({
          d: last.trip.departureTime.toISOString(),
          i: last.trip.id,
        });
        nextCursor = Buffer.from(payload).toString('base64url');
      }

      return { items, nextCursor };
    },
  } satisfies ITripsRepository;
}
