import { TripStatus } from './enums';

export class TripNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Trip not found') {
    super(message);
    this.name = 'TripNotFoundError';
  }
}

export class TripForbiddenError extends Error {
  readonly kind = 'forbidden' as const;
  constructor(message = 'Trip belongs to another operator') {
    super(message);
    this.name = 'TripForbiddenError';
  }
}

export class TripValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'TripValidationError';
  }
}

export class TripConflictError extends Error {
  readonly kind = 'conflict' as const;
  constructor(message = 'Vehicle has an overlapping trip in the requested time window') {
    super(message);
    this.name = 'TripConflictError';
  }
}

export class TripInvalidTransitionError extends Error {
  readonly kind = 'invalid_transition' as const;
  constructor(from: TripStatus, to: TripStatus) {
    super(`Cannot transition trip from '${from}' to '${to}'`);
    this.name = 'TripInvalidTransitionError';
  }
}
