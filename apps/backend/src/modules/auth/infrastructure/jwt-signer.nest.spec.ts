import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';

import { JwtPayload } from '../domain/jwt-payload';

import { JwtSignerNest } from './jwt-signer.nest';

describe('JwtSignerNest', () => {
  const signer = new JwtSignerNest(new JwtService({ secret: 'test-secret' }));

  const payload: JwtPayload = { sub: 1, role: 'customer', operatorId: null, typ: 'access' };

  it('round-trips a payload via sign + verify', async () => {
    const token = await signer.sign(payload, { expiresIn: '1m' });
    expect(typeof token).toBe('string');
    const verified = await signer.verify(token);
    expect(verified).toMatchObject(payload);
  });

  it('verify rejects a forged token', async () => {
    await expect(signer.verify('not-a-jwt')).rejects.toBeDefined();
  });
});
