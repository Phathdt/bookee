import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapTripsDomainError } from './map-domain-error';

import {
  TripConflictError,
  TripForbiddenError,
  TripInvalidTransitionError,
  TripNotFoundError,
  TripValidationError,
} from '@/modules/trips/domain/errors';

describe('mapTripsDomainError', () => {
  it('TripNotFoundError → NotFoundException', () => {
    expect(mapTripsDomainError(new TripNotFoundError())).toBeInstanceOf(NotFoundException);
  });

  it('TripForbiddenError → ForbiddenException', () => {
    expect(mapTripsDomainError(new TripForbiddenError())).toBeInstanceOf(ForbiddenException);
  });

  it('TripValidationError → BadRequestException', () => {
    expect(mapTripsDomainError(new TripValidationError('bad'))).toBeInstanceOf(BadRequestException);
  });

  it('TripConflictError → ConflictException', () => {
    expect(mapTripsDomainError(new TripConflictError())).toBeInstanceOf(ConflictException);
  });

  it('TripInvalidTransitionError → ConflictException', () => {
    expect(
      mapTripsDomainError(new TripInvalidTransitionError('completed', 'scheduled')),
    ).toBeInstanceOf(ConflictException);
  });

  it('unknown errors pass through unchanged', () => {
    const e = new Error('other');
    expect(mapTripsDomainError(e)).toBe(e);
  });
});
