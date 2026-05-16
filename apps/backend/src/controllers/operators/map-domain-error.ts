import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  OperatorConflictError,
  OperatorNotActiveError,
  OperatorNotFoundError,
} from '@/modules/operators/domain/errors';
import { UserNotFoundError } from '@/modules/users/domain/errors';

export function mapOperatorsDomainError(err: unknown): Error {
  if (err instanceof OperatorNotFoundError) return new NotFoundException(err.message);
  if (err instanceof UserNotFoundError) return new BadRequestException(err.message);
  if (err instanceof OperatorConflictError) return new ConflictException(err.message);
  if (err instanceof OperatorNotActiveError) return new ForbiddenException(err.message);
  return err as Error;
}
