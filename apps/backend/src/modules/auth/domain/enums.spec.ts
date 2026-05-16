import { describe, expect, it } from 'vitest';

import { isUserRole, USER_ROLES } from './enums';

describe('isUserRole', () => {
  it('accepts every known role', () => {
    for (const role of USER_ROLES) {
      expect(isUserRole(role)).toBe(true);
    }
  });

  it('rejects unknown strings', () => {
    expect(isUserRole('superuser')).toBe(false);
    expect(isUserRole('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(42)).toBe(false);
    expect(isUserRole({ role: 'admin' })).toBe(false);
  });
});
