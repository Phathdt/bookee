import { describe, expect, it } from 'vitest';

import { getApiErrorMessage, isConflictError } from './api-error';

describe('getApiErrorMessage', () => {
  it('returns fallback for null/undefined', () => {
    expect(getApiErrorMessage(null)).toBe('An error occurred');
    expect(getApiErrorMessage(undefined, 'Oops')).toBe('Oops');
  });

  it('reads response.data.message string', () => {
    const err = { response: { data: { message: 'Validation failed' } } };
    expect(getApiErrorMessage(err)).toBe('Validation failed');
  });

  it('joins array of messages', () => {
    const err = { response: { data: { message: ['a is required', 'b is invalid'] } } };
    expect(getApiErrorMessage(err)).toBe('a is required, b is invalid');
  });

  it('falls back to err.message', () => {
    expect(getApiErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  it('returns fallback when message is non-string', () => {
    const err = { response: { data: { message: 42 } } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('fallback');
  });
});

describe('isConflictError', () => {
  it('detects 409 status', () => {
    expect(isConflictError({ response: { status: 409 } })).toBe(true);
  });
  it('returns false for other statuses', () => {
    expect(isConflictError({ response: { status: 500 } })).toBe(false);
    expect(isConflictError(null)).toBe(false);
    expect(isConflictError({})).toBe(false);
  });
});
