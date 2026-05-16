// User roles for auth + access control. Stored as plain string in DB; Zod
// validates the value at every boundary (DTO, JWT decode, service input).
export const USER_ROLES = ['customer', 'operator', 'driver', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
