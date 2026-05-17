export class BookingNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Booking not found') {
    super(message);
    this.name = 'BookingNotFoundError';
  }
}

export class BookingValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'BookingValidationError';
  }
}

export class BookingForbiddenError extends Error {
  readonly kind = 'forbidden' as const;
  constructor(message = 'Access to this booking is not allowed') {
    super(message);
    this.name = 'BookingForbiddenError';
  }
}

export class BookingNotPendingError extends Error {
  readonly kind = 'not_pending' as const;
  constructor(message = 'Booking is not in pending status') {
    super(message);
    this.name = 'BookingNotPendingError';
  }
}

export class SeatUnavailableError extends Error {
  readonly kind = 'seat_unavailable' as const;
  readonly conflictingSeatIds: number[];
  constructor(conflictingSeatIds: number[], message = 'One or more seats are unavailable') {
    super(message);
    this.name = 'SeatUnavailableError';
    this.conflictingSeatIds = conflictingSeatIds;
  }
}

export class BookingLookupNotFoundError extends Error {
  readonly kind = 'lookup_not_found' as const;
  constructor(message = 'No booking found for the given code and phone') {
    super(message);
    this.name = 'BookingLookupNotFoundError';
  }
}
