import { TripStatus } from '../enums';

export interface TripSearchResult {
  trip: {
    id: number;
    departureTime: Date;
    arrivalTime: Date;
    basePrice: number;
    status: TripStatus;
  };
  route: {
    id: number;
    distanceKm: number;
    durationMinutes: number;
    fromStation: { id: number; name: string; city: string; address: string };
    toStation: { id: number; name: string; city: string; address: string };
    company: { id: number; name: string };
  };
  vehicle: { id: number; plateNumber: string; type: string; totalSeats: number };
  availableSeats: number;
}

export interface TripSearchPage {
  items: TripSearchResult[];
  /** Opaque base64url-encoded cursor. Null when no further pages exist. */
  nextCursor: string | null;
}
