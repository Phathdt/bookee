import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setAuthToken = vi.fn();
vi.mock('@bookee/api-client', () => ({
  setAuthToken: (token: string | null) => setAuthToken(token),
}));

import { clearToken, getStoredToken, hydrateAuth, saveToken } from './auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when no token stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('saveToken persists to localStorage and syncs api-client', () => {
    saveToken('abc.def.ghi');
    expect(localStorage.getItem('bookee.access-token')).toBe('abc.def.ghi');
    expect(getStoredToken()).toBe('abc.def.ghi');
    expect(setAuthToken).toHaveBeenCalledWith('abc.def.ghi');
  });

  it('clearToken removes localStorage and clears api-client', () => {
    saveToken('tok');
    setAuthToken.mockClear();
    clearToken();
    expect(localStorage.getItem('bookee.access-token')).toBeNull();
    expect(setAuthToken).toHaveBeenCalledWith(null);
  });

  it('hydrateAuth applies token when present', () => {
    localStorage.setItem('bookee.access-token', 'restored');
    hydrateAuth();
    expect(setAuthToken).toHaveBeenCalledWith('restored');
  });

  it('hydrateAuth is a no-op when no token', () => {
    hydrateAuth();
    expect(setAuthToken).not.toHaveBeenCalled();
  });

  it('is no-op against localStorage when window is absent (SSR guard)', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    try {
      expect(getStoredToken()).toBeNull();
      saveToken('ssr.tok');
      clearToken();
      expect(setAuthToken).toHaveBeenLastCalledWith(null);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
