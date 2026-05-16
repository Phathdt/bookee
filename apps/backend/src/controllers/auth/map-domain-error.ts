import { ConflictException, UnauthorizedException } from '@nestjs/common';

import { AuthConflictError, AuthUnauthorizedError } from '@/modules/auth/domain/errors';

/**
 * Translate application-layer auth errors into the appropriate HTTP
 * exception. Anything we don't recognise gets re-thrown unchanged so the
 * default Nest exception filter can produce a 500.
 */
export function mapAuthDomainError(err: unknown): Error {
  if (err instanceof AuthConflictError) return new ConflictException(err.message);
  if (err instanceof AuthUnauthorizedError) return new UnauthorizedException(err.message);
  return err as Error;
}
