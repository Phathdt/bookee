import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  BookingForbiddenError,
  BookingLookupNotFoundError,
  BookingNotFoundError,
  BookingNotPendingError,
  BookingValidationError,
  SeatUnavailableError,
} from '@/modules/bookings/domain/errors';

import { mapBookingsDomainError } from './map-domain-error';

describe('mapBookingsDomainError', () => {
  it('maps BookingNotFoundError → 404', () => {
    const mapped = mapBookingsDomainError(new BookingNotFoundError());
    expect(mapped).toBeInstanceOf(NotFoundException);
  });

  it('maps BookingLookupNotFoundError → 404', () => {
    const mapped = mapBookingsDomainError(new BookingLookupNotFoundError());
    expect(mapped).toBeInstanceOf(NotFoundException);
  });

  it('maps BookingValidationError → 400', () => {
    const mapped = mapBookingsDomainError(new BookingValidationError('bad input'));
    expect(mapped).toBeInstanceOf(BadRequestException);
  });

  it('maps BookingForbiddenError → 403', () => {
    const mapped = mapBookingsDomainError(new BookingForbiddenError());
    expect(mapped).toBeInstanceOf(ForbiddenException);
  });

  it('maps BookingNotPendingError → 409', () => {
    const mapped = mapBookingsDomainError(new BookingNotPendingError());
    expect(mapped).toBeInstanceOf(ConflictException);
  });

  it('maps SeatUnavailableError → 409 with conflictingSeatIds', () => {
    const err = new SeatUnavailableError([3, 5]);
    const mapped = mapBookingsDomainError(err);
    expect(mapped).toBeInstanceOf(ConflictException);
    const body = (mapped as ConflictException).getResponse() as Record<string, unknown>;
    expect(body.conflictingSeatIds).toEqual([3, 5]);
  });

  it('passes through unknown errors unchanged', () => {
    const raw = new Error('unexpected');
    const mapped = mapBookingsDomainError(raw);
    expect(mapped).toBe(raw);
  });
});
