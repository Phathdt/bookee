export class SeatLayoutNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Seat layout not found') {
    super(message);
    this.name = 'SeatLayoutNotFoundError';
  }
}

export class SeatLayoutInUseError extends Error {
  readonly kind = 'in_use' as const;
  constructor(message = 'Seat layout is referenced by existing vehicles') {
    super(message);
    this.name = 'SeatLayoutInUseError';
  }
}

export class SeatLayoutValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SeatLayoutValidationError';
  }
}
