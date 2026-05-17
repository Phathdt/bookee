import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import {
  StationInUseError,
  StationNotFoundError,
  StationValidationError,
} from '@/modules/stations/domain/errors';

export function mapStationsDomainError(err: unknown): Error {
  if (err instanceof StationNotFoundError) return new NotFoundException(err.message);
  if (err instanceof StationInUseError) return new ConflictException(err.message);
  if (err instanceof StationValidationError) return new BadRequestException(err.message);
  return err as Error;
}
