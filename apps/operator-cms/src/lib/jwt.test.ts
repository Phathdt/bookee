import { describe, expect, it } from 'vitest';

import { decodeJwtPayload } from './jwt';

function encodePayload(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const token = encodePayload({ sub: 1, role: 'admin', operatorId: null });
    const out = decodeJwtPayload(token);
    expect(out).toEqual({ sub: 1, role: 'admin', operatorId: null });
  });

  it('returns null for malformed token (wrong segment count)', () => {
    expect(decodeJwtPayload('abc.def')).toBeNull();
  });

  it('returns null for non-JSON payload', () => {
    expect(decodeJwtPayload('a.notbase64@@@.c')).toBeNull();
  });

  it('handles url-safe base64 (-, _) chars', () => {
    const token = encodePayload({ sub: 99, role: 'operator', operatorId: 7 });
    expect(decodeJwtPayload(token)?.role).toBe('operator');
  });
});
