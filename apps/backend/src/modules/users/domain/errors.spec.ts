import { describe, expect, it } from 'vitest';

import { UserConflictError, UserNotFoundError } from './errors';

describe('users domain errors', () => {
  it('UserNotFoundError defaults message + tags kind', () => {
    const err = new UserNotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe('not_found');
    expect(err.message).toBe('User not found');
    expect(err.name).toBe('UserNotFoundError');
  });

  it('UserNotFoundError accepts a custom message', () => {
    expect(new UserNotFoundError('gone').message).toBe('gone');
  });

  it('UserConflictError tags kind=conflict', () => {
    const err = new UserConflictError('email taken');
    expect(err.kind).toBe('conflict');
    expect(err.message).toBe('email taken');
    expect(err.name).toBe('UserConflictError');
  });
});
