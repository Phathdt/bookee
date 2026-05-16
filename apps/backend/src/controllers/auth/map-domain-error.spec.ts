import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { mapAuthDomainError } from './map-domain-error';

import { AuthConflictError, AuthUnauthorizedError } from '@/modules/auth/domain/errors';

describe('mapAuthDomainError', () => {
  it('maps AuthConflictError to ConflictException', () => {
    const out = mapAuthDomainError(new AuthConflictError('dup'));
    expect(out).toBeInstanceOf(ConflictException);
    expect(out.message).toBe('dup');
  });

  it('maps AuthUnauthorizedError to UnauthorizedException', () => {
    const out = mapAuthDomainError(new AuthUnauthorizedError('bad'));
    expect(out).toBeInstanceOf(UnauthorizedException);
    expect(out.message).toBe('bad');
  });

  it('passes unknown errors through unchanged', () => {
    const odd = new Error('strange');
    expect(mapAuthDomainError(odd)).toBe(odd);
  });
});
