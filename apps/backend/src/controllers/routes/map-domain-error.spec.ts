import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapRoutesDomainError } from './map-domain-error';

import {
  RouteForbiddenError,
  RouteImmutableFieldError,
  RouteNotFoundError,
  RouteValidationError,
} from '@/modules/routes/domain/errors';

describe('mapRoutesDomainError', () => {
  it('NotFound -> NotFoundException', () => {
    expect(mapRoutesDomainError(new RouteNotFoundError('x'))).toBeInstanceOf(NotFoundException);
  });

  it('Forbidden -> ForbiddenException', () => {
    expect(mapRoutesDomainError(new RouteForbiddenError('x'))).toBeInstanceOf(ForbiddenException);
  });

  it('Validation -> BadRequestException', () => {
    expect(mapRoutesDomainError(new RouteValidationError('x'))).toBeInstanceOf(BadRequestException);
  });

  it('ImmutableField -> BadRequestException', () => {
    expect(mapRoutesDomainError(new RouteImmutableFieldError('fromStationId'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('unknown errors pass through', () => {
    const e = new Error('other');
    expect(mapRoutesDomainError(e)).toBe(e);
  });
});
