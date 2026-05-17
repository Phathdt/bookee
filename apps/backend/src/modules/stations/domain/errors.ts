export class StationNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Station not found') {
    super(message);
    this.name = 'StationNotFoundError';
  }
}

export class StationInUseError extends Error {
  readonly kind = 'in_use' as const;
  constructor(message = 'Station is referenced by existing routes') {
    super(message);
    this.name = 'StationInUseError';
  }
}

export class StationValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'StationValidationError';
  }
}
