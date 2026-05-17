import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  RouteForbiddenError,
  RouteImmutableFieldError,
  RouteNotFoundError,
  RouteValidationError,
} from '@/modules/routes/domain/errors';

export function mapRoutesDomainError(err: unknown): Error {
  if (err instanceof RouteNotFoundError) return new NotFoundException(err.message);
  if (err instanceof RouteForbiddenError) return new ForbiddenException(err.message);
  if (err instanceof RouteValidationError) return new BadRequestException(err.message);
  if (err instanceof RouteImmutableFieldError) return new BadRequestException(err.message);
  return err as Error;
}
