import type { UserRole } from '../enums';

/**
 * User domain entity. Plain interface — the canonical shape exchanged
 * between Service and Repository.
 *
 *   Service ←User→ Repository
 *
 * Repository implementations map raw rows into this shape; service code
 * never touches Prisma types directly.
 */
export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  operatorId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** User shape safe to serialize outward (credentials stripped). */
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omitted, ...rest } = user;
  return rest;
}
