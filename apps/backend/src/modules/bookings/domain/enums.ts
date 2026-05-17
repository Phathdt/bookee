export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
