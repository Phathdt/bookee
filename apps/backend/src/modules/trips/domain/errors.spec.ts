import { describe, expect, it } from 'vitest';

import {
  TripConflictError,
  TripForbiddenError,
  TripInvalidTransitionError,
  TripNotFoundError,
  TripValidationError,
} from './errors';

describe('Trip domain errors', () => {
  it('TripNotFoundError has kind=not_found and default message', () => {
    const e = new TripNotFoundError();
    expect(e.kind).toBe('not_found');
    expect(e.message).toBe('Trip not found');
    expect(e).toBeInstanceOf(Error);
  });

  it('TripNotFoundError accepts custom message', () => {
    const e = new TripNotFoundError('custom');
    expect(e.message).toBe('custom');
  });

  it('TripForbiddenError has kind=forbidden', () => {
    const e = new TripForbiddenError();
    expect(e.kind).toBe('forbidden');
  });

  it('TripValidationError has kind=invalid and carries message', () => {
    const e = new TripValidationError('bad input');
    expect(e.kind).toBe('invalid');
    expect(e.message).toBe('bad input');
  });

  it('TripConflictError has kind=conflict and default message', () => {
    const e = new TripConflictError();
    expect(e.kind).toBe('conflict');
    expect(e.message).toMatch(/overlap/i);
  });

  it('TripInvalidTransitionError has kind=invalid_transition and encodes states', () => {
    const e = new TripInvalidTransitionError('completed', 'scheduled');
    expect(e.kind).toBe('invalid_transition');
    expect(e.message).toMatch(/completed/);
    expect(e.message).toMatch(/scheduled/);
  });
});
