/** User no longer exists (deleted between auth + this request, or stale token). */
export class UserNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

/** Email/phone change collided with an existing account. */
export class UserConflictError extends Error {
  readonly kind = 'conflict' as const;
  constructor(message: string) {
    super(message);
    this.name = 'UserConflictError';
  }
}
