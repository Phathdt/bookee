export class OperatorNotFoundError extends Error {
  readonly kind = 'not_found' as const;
  constructor(message = 'Operator not found') {
    super(message);
    this.name = 'OperatorNotFoundError';
  }
}

export class OperatorConflictError extends Error {
  readonly kind = 'conflict' as const;
  constructor(message: string) {
    super(message);
    this.name = 'OperatorConflictError';
  }
}

export class OperatorNotActiveError extends Error {
  readonly kind = 'not_active' as const;
  constructor(message = 'Operator is not active') {
    super(message);
    this.name = 'OperatorNotActiveError';
  }
}
