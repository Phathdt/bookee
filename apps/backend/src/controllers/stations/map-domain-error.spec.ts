import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapStationsDomainError } from './map-domain-error';

import {
  StationInUseError,
  StationNotFoundError,
  StationValidationError,
} from '@/modules/stations/domain/errors';

describe('mapStationsDomainError', () => {
  it('NotFound -> NotFoundException', () => {
    expect(mapStationsDomainError(new StationNotFoundError('x'))).toBeInstanceOf(NotFoundException);
  });

  it('InUse -> ConflictException', () => {
    expect(mapStationsDomainError(new StationInUseError('x'))).toBeInstanceOf(ConflictException);
  });

  it('Validation -> BadRequestException', () => {
    expect(mapStationsDomainError(new StationValidationError('x'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('unknown errors pass through', () => {
    const e = new Error('other');
    expect(mapStationsDomainError(e)).toBe(e);
  });
});
