import { describe, expect, it } from 'vitest';

import { OperatorConflictError, OperatorNotActiveError, OperatorNotFoundError } from './errors';

describe('operators domain errors', () => {
  it('OperatorNotFoundError defaults message + kind', () => {
    const err = new OperatorNotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe('not_found');
    expect(err.message).toBe('Operator not found');
    expect(err.name).toBe('OperatorNotFoundError');
  });

  it('OperatorNotFoundError accepts custom message', () => {
    expect(new OperatorNotFoundError('gone').message).toBe('gone');
  });

  it('OperatorConflictError tags kind=conflict', () => {
    const err = new OperatorConflictError('dup');
    expect(err.kind).toBe('conflict');
    expect(err.message).toBe('dup');
    expect(err.name).toBe('OperatorConflictError');
  });

  it('OperatorNotActiveError defaults message + kind', () => {
    const err = new OperatorNotActiveError();
    expect(err.kind).toBe('not_active');
    expect(err.message).toBe('Operator is not active');
    expect(err.name).toBe('OperatorNotActiveError');
  });

  it('OperatorNotActiveError accepts custom message', () => {
    expect(new OperatorNotActiveError('go away').message).toBe('go away');
  });
});
