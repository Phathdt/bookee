import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { JwtPayload } from '../../domain/jwt-payload';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  const strategy = new JwtStrategy();

  it('returns payload for valid access token', () => {
    const p: JwtPayload = { sub: 1, role: 'customer', operatorId: null, typ: 'access' };
    expect(strategy.validate(p)).toEqual(p);
  });

  it('rejects refresh tokens', () => {
    const p: JwtPayload = { sub: 1, role: 'admin', operatorId: null, typ: 'refresh' };
    expect(() => strategy.validate(p)).toThrow(UnauthorizedException);
  });

  it('rejects unknown role', () => {
    const p = {
      sub: 1,
      role: 'superuser',
      operatorId: null,
      typ: 'access',
    } as unknown as JwtPayload;
    expect(() => strategy.validate(p)).toThrow(UnauthorizedException);
  });
});
