import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  BookingForbiddenError,
  BookingLookupNotFoundError,
  BookingNotFoundError,
  BookingNotPendingError,
  BookingValidationError,
  SeatUnavailableError,
} from '@/modules/bookings/domain/errors';

export function mapBookingsDomainError(err: unknown): Error {
  if (err instanceof BookingNotFoundError) return new NotFoundException(err.message);
  if (err instanceof BookingLookupNotFoundError) return new NotFoundException(err.message);
  if (err instanceof BookingValidationError) return new BadRequestException(err.message);
  if (err instanceof BookingForbiddenError) return new ForbiddenException(err.message);
  if (err instanceof BookingNotPendingError) return new ConflictException(err.message);
  if (err instanceof SeatUnavailableError) {
    return new ConflictException({
      message: err.message,
      conflictingSeatIds: err.conflictingSeatIds,
    });
  }
  return err as Error;
}
