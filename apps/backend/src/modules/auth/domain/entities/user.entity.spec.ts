import { describe, expect, it } from 'vitest';

import { toPublicUser, User } from './user.entity';

describe('User entity helpers', () => {
  const sample: User = {
    id: 1,
    name: 'A',
    phone: '0900000001',
    email: 'a@example.com',
    passwordHash: 'secret-hash',
    role: 'customer',
    operatorId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  it('toPublicUser strips passwordHash', () => {
    const pub = toPublicUser(sample);
    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub.email).toBe('a@example.com');
  });

  it('toPublicUser preserves every other field', () => {
    const pub = toPublicUser(sample);
    expect(pub.id).toBe(1);
    expect(pub.role).toBe('customer');
    expect(pub.operatorId).toBeNull();
    expect(pub.createdAt).toEqual(new Date('2026-01-01'));
  });
});
