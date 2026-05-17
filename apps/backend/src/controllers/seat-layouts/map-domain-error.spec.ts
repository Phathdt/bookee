import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapSeatLayoutsDomainError } from './map-domain-error';

import {
  SeatLayoutInUseError,
  SeatLayoutNotFoundError,
  SeatLayoutValidationError,
} from '@/modules/seat-layouts/domain/errors';

describe('mapSeatLayoutsDomainError', () => {
  it('NotFound -> NotFoundException', () => {
    expect(mapSeatLayoutsDomainError(new SeatLayoutNotFoundError('x'))).toBeInstanceOf(
      NotFoundException,
    );
  });

  it('InUse -> ConflictException', () => {
    expect(mapSeatLayoutsDomainError(new SeatLayoutInUseError('x'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('Validation -> BadRequestException', () => {
    expect(mapSeatLayoutsDomainError(new SeatLayoutValidationError('x'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('unknown errors pass through', () => {
    const e = new Error('other');
    expect(mapSeatLayoutsDomainError(e)).toBe(e);
  });
});
