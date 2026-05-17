export class VehicleNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Vehicle not found') {
    super(message);
    this.name = 'VehicleNotFoundError';
  }
}

export class VehicleForbiddenError extends Error {
  readonly kind = 'forbidden' as const;
  constructor(message = 'Vehicle belongs to another operator') {
    super(message);
    this.name = 'VehicleForbiddenError';
  }
}

export class VehicleValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'VehicleValidationError';
  }
}

export class VehiclePlateConflictError extends Error {
  readonly kind = 'plate_conflict' as const;
  constructor(message = 'A vehicle with this plate number already exists') {
    super(message);
    this.name = 'VehiclePlateConflictError';
  }
}

export class VehicleInUseError extends Error {
  readonly kind = 'in_use' as const;
  constructor(message = 'Vehicle is referenced by active trips') {
    super(message);
    this.name = 'VehicleInUseError';
  }
}
