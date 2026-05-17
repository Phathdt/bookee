export const TRIP_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export function isTripStatus(value: unknown): value is TripStatus {
  return TRIP_STATUSES.includes(value as TripStatus);
}
