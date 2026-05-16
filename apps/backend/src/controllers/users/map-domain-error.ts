import { ConflictException, NotFoundException } from '@nestjs/common';

import { UserConflictError, UserNotFoundError } from '@/modules/users/domain/errors';

export function mapUsersDomainError(err: unknown): Error {
  if (err instanceof UserNotFoundError) return new NotFoundException(err.message);
  if (err instanceof UserConflictError) return new ConflictException(err.message);
  return err as Error;
}
