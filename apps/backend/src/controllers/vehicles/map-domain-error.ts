import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from '@/modules/vehicles/domain/errors';

export function mapVehiclesDomainError(err: unknown): Error {
  if (err instanceof VehicleNotFoundError) return new NotFoundException(err.message);
  if (err instanceof VehicleForbiddenError) return new ForbiddenException(err.message);
  if (err instanceof VehicleValidationError) return new BadRequestException(err.message);
  if (err instanceof VehiclePlateConflictError) return new ConflictException(err.message);
  if (err instanceof VehicleInUseError) return new ConflictException(err.message);
  return err as Error;
}
