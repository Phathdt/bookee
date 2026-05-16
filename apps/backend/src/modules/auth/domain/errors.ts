/**
 * Auth-domain errors. Plain classes (no framework imports) so they can be
 * thrown from the application layer. Infrastructure / HTTP controllers
 * translate these into framework-specific exceptions.
 */

export class AuthConflictError extends Error {
  readonly kind = 'conflict' as const;
  constructor(message: string) {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export class AuthUnauthorizedError extends Error {
  readonly kind = 'unauthorized' as const;
  constructor(message: string) {
    super(message);
    this.name = 'AuthUnauthorizedError';
  }
}
