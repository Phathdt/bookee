export class RouteNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Route not found') {
    super(message);
    this.name = 'RouteNotFoundError';
  }
}

export class RouteForbiddenError extends Error {
  readonly kind = 'forbidden' as const;
  constructor(message = 'Route belongs to another operator') {
    super(message);
    this.name = 'RouteForbiddenError';
  }
}

export class RouteValidationError extends Error {
  readonly kind = 'invalid' as const;
  constructor(message: string) {
    super(message);
    this.name = 'RouteValidationError';
  }
}

export class RouteImmutableFieldError extends Error {
  readonly kind = 'immutable' as const;
  constructor(field: string) {
    super(`Cannot modify immutable field: ${field}. Create a new route instead.`);
    this.name = 'RouteImmutableFieldError';
  }
}
