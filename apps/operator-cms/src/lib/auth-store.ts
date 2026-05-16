import { setAuthToken } from '@bookee/api-client';

/**
 * Thin localStorage-backed token store. Sync-only API so React render code
 * can read the current token without async. The api-client's setAuthToken
 * is kept in sync on every write so generated hooks pick up the bearer.
 */
const STORAGE_KEY = 'bookee.access-token';

export function getStoredToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, token);
  setAuthToken(token);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  setAuthToken(null);
}

/** Call once on app boot so the api-client sees a token from a previous session. */
export function hydrateAuth(): void {
  const t = getStoredToken();
  if (t) setAuthToken(t);
}
