import { UserRole } from './enums';

/**
 * Stable shape of the access/refresh token payload. Reduce changes to this
 * carefully — every running client + driver app caches tokens minted with
 * the current shape, and forced re-login is a UX cost.
 */
export interface JwtPayload {
  /** User id (subject). */
  sub: number;
  role: UserRole;
  /** Set for operator + driver roles; null for customer/admin. */
  operatorId: number | null;
  /** "access" or "refresh" — guards reject refresh-token use on access routes. */
  typ: 'access' | 'refresh';
}
