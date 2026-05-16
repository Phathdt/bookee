import { describe, expect, it } from 'vitest';

import { AuthConflictError, AuthUnauthorizedError } from './errors';

describe('auth domain errors', () => {
  it('AuthConflictError carries kind=conflict', () => {
    const err = new AuthConflictError('email taken');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthConflictError);
    expect(err.kind).toBe('conflict');
    expect(err.message).toBe('email taken');
    expect(err.name).toBe('AuthConflictError');
  });

  it('AuthUnauthorizedError carries kind=unauthorized', () => {
    const err = new AuthUnauthorizedError('bad creds');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthUnauthorizedError);
    expect(err.kind).toBe('unauthorized');
    expect(err.message).toBe('bad creds');
    expect(err.name).toBe('AuthUnauthorizedError');
  });
});
