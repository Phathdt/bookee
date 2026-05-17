import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  TripConflictError,
  TripForbiddenError,
  TripInvalidTransitionError,
  TripNotFoundError,
  TripValidationError,
} from '@/modules/trips/domain/errors';

export function mapTripsDomainError(err: unknown): Error {
  if (err instanceof TripNotFoundError) return new NotFoundException(err.message);
  if (err instanceof TripForbiddenError) return new ForbiddenException(err.message);
  if (err instanceof TripValidationError) return new BadRequestException(err.message);
  if (err instanceof TripConflictError) return new ConflictException(err.message);
  if (err instanceof TripInvalidTransitionError) return new ConflictException(err.message);
  return err as Error;
}
