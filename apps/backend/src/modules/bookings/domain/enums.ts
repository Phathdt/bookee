export const BOOKING_STATUSES = ['pending', 'paid', 'confirmed', 'cancelled', 'expired'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
