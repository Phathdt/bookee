import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  SeatLayoutInUseError,
  SeatLayoutNotFoundError,
  SeatLayoutValidationError,
} from '@/modules/seat-layouts/domain/errors';

export function mapSeatLayoutsDomainError(err: unknown): Error {
  if (err instanceof SeatLayoutNotFoundError) return new NotFoundException(err.message);
  if (err instanceof SeatLayoutInUseError) return new ConflictException(err.message);
  if (err instanceof SeatLayoutValidationError) return new BadRequestException(err.message);
  return err as Error;
}
