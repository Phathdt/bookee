import { Trip } from '@/modules/trips/domain/entities/trip.entity';
import { TripStatus } from '@/modules/trips/domain/enums';
import {
  CreateTripInput,
  ITripsRepository,
  TripListFilter,
} from '@/modules/trips/domain/interfaces/trips.repository';

export function makeFakeTripsRepository(): ITripsRepository {
  const rows = new Map<number, Trip>();
  let nextId = 1;

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
  } satisfies ITripsRepository;
}
