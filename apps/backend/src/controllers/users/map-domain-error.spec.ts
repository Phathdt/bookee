import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapUsersDomainError } from './map-domain-error';

import { UserConflictError, UserNotFoundError } from '@/modules/users/domain/errors';

describe('mapUsersDomainError', () => {
  it('maps UserNotFoundError to NotFoundException', () => {
    const out = mapUsersDomainError(new UserNotFoundError('gone'));
    expect(out).toBeInstanceOf(NotFoundException);
    expect(out.message).toBe('gone');
  });

  it('maps UserConflictError to ConflictException', () => {
    const out = mapUsersDomainError(new UserConflictError('dup'));
    expect(out).toBeInstanceOf(ConflictException);
    expect(out.message).toBe('dup');
  });

  it('passes unknown errors through', () => {
    const odd = new Error('other');
    expect(mapUsersDomainError(odd)).toBe(odd);
  });
});
