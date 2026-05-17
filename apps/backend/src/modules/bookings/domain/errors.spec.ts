import { describe, expect, it } from 'vitest';

import {
  BookingForbiddenError,
  BookingLookupNotFoundError,
  BookingNotFoundError,
  BookingNotPendingError,
  BookingValidationError,
  SeatUnavailableError,
} from './errors';

describe('Booking domain errors', () => {
  it('BookingNotFoundError has kind=not_found', () => {
    const err = new BookingNotFoundError();
    expect(err.kind).toBe('not_found');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Booking not found');
  });

  it('BookingValidationError has kind=invalid', () => {
    const err = new BookingValidationError('seat/passenger mismatch');
    expect(err.kind).toBe('invalid');
    expect(err.message).toBe('seat/passenger mismatch');
  });

  it('BookingForbiddenError has kind=forbidden', () => {
    const err = new BookingForbiddenError();
    expect(err.kind).toBe('forbidden');
  });

  it('BookingNotPendingError has kind=not_pending', () => {
    const err = new BookingNotPendingError();
    expect(err.kind).toBe('not_pending');
  });

  it('SeatUnavailableError has kind=seat_unavailable and exposes conflictingSeatIds', () => {
    const err = new SeatUnavailableError([3, 5, 7]);
    expect(err.kind).toBe('seat_unavailable');
    expect(err.conflictingSeatIds).toEqual([3, 5, 7]);
  });

  it('BookingLookupNotFoundError has kind=lookup_not_found', () => {
    const err = new BookingLookupNotFoundError();
    expect(err.kind).toBe('lookup_not_found');
  });
});
