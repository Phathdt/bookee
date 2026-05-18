import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema, renameSchema } from './auth-schemas';

describe('loginSchema', () => {
  it('accepts valid payload', () => {
    expect(loginSchema.safeParse({ identifier: 'a@b.co', password: '12345678' }).success).toBe(
      true,
    );
  });
  it('rejects empty identifier', () => {
    const res = loginSchema.safeParse({ identifier: '', password: '12345678' });
    expect(res.success).toBe(false);
  });
  it('rejects short password', () => {
    const res = loginSchema.safeParse({ identifier: 'x', password: '123' });
    expect(res.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const base = { name: 'A', phone: '0901234567', email: 'a@b.co', password: '12345678' };

  it('accepts valid', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });
  it('rejects bad email', () => {
    expect(registerSchema.safeParse({ ...base, email: 'not-email' }).success).toBe(false);
  });
  it('rejects empty name', () => {
    expect(registerSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });
  it('rejects short phone', () => {
    expect(registerSchema.safeParse({ ...base, phone: '123' }).success).toBe(false);
  });
});

describe('renameSchema', () => {
  it('trims and accepts', () => {
    const res = renameSchema.safeParse({ name: '  Alice  ' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe('Alice');
  });
  it('rejects whitespace-only', () => {
    expect(renameSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
