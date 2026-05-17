/**
 * Pure JWT payload decoder — no signature verification.
 * Server enforces token validity; this is only used for reading user info client-side.
 */

export interface JwtPayload {
  sub: number;
  role: 'customer' | 'operator' | 'driver' | 'admin';
  operatorId: number | null;
  iat?: number;
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const segment = parts[1] ?? '';
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
