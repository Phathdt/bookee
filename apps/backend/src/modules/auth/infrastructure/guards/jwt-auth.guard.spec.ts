import { describe, expect, it } from 'vitest';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('constructs as a passport-jwt AuthGuard', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeInstanceOf(JwtAuthGuard);
    expect(typeof guard.canActivate).toBe('function');
  });
});
