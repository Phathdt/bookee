import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapOperatorsDomainError } from './map-domain-error';

import {
  OperatorConflictError,
  OperatorNotActiveError,
  OperatorNotFoundError,
} from '@/modules/operators/domain/errors';
import { UserNotFoundError } from '@/modules/users/domain/errors';

describe('mapOperatorsDomainError', () => {
  it('OperatorNotFoundError -> NotFoundException', () => {
    expect(mapOperatorsDomainError(new OperatorNotFoundError('x'))).toBeInstanceOf(
      NotFoundException,
    );
  });

  it('UserNotFoundError -> BadRequestException (controller param semantics)', () => {
    expect(mapOperatorsDomainError(new UserNotFoundError('x'))).toBeInstanceOf(BadRequestException);
  });

  it('OperatorConflictError -> ConflictException', () => {
    expect(mapOperatorsDomainError(new OperatorConflictError('dup'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('OperatorNotActiveError -> ForbiddenException', () => {
    expect(mapOperatorsDomainError(new OperatorNotActiveError('na'))).toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('unknown errors pass through unchanged', () => {
    const e = new Error('weird');
    expect(mapOperatorsDomainError(e)).toBe(e);
  });
});
