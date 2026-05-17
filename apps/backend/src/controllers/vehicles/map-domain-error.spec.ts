import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapVehiclesDomainError } from './map-domain-error';

import {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from '@/modules/vehicles/domain/errors';

describe('mapVehiclesDomainError', () => {
  it('NotFound -> NotFoundException', () => {
    expect(mapVehiclesDomainError(new VehicleNotFoundError('x'))).toBeInstanceOf(NotFoundException);
  });

  it('Forbidden -> ForbiddenException', () => {
    expect(mapVehiclesDomainError(new VehicleForbiddenError('x'))).toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('Validation -> BadRequestException', () => {
    expect(mapVehiclesDomainError(new VehicleValidationError('x'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('PlateConflict -> ConflictException', () => {
    expect(mapVehiclesDomainError(new VehiclePlateConflictError('x'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('InUse -> ConflictException', () => {
    expect(mapVehiclesDomainError(new VehicleInUseError('x'))).toBeInstanceOf(ConflictException);
  });

  it('unknown errors pass through', () => {
    const e = new Error('other');
    expect(mapVehiclesDomainError(e)).toBe(e);
  });
});
