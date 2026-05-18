import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setAuthToken = vi.fn();
vi.mock('@bookee/api-client', () => ({
  setAuthToken: (t: string | null) => setAuthToken(t),
  useLoginUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useRegisterUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

import { useAuthFlow, useLoginMutation, useRegisterMutation } from './use-auth-flow';

describe('useAuthFlow', () => {
  beforeEach(() => {
    localStorage.clear();
    setAuthToken.mockClear();
  });
  afterEach(() => localStorage.clear());

  it('starts unauthenticated when no token', () => {
    const { result } = renderHook(() => useAuthFlow());
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthed).toBe(false);
  });

  it('hydrates token from localStorage', () => {
    localStorage.setItem('bookee.access-token', 'pre.existing.tok');
    const { result } = renderHook(() => useAuthFlow());
    expect(result.current.isAuthed).toBe(true);
    expect(result.current.token).toBe('pre.existing.tok');
  });

  it('signIn saves token and updates state', () => {
    const { result } = renderHook(() => useAuthFlow());
    act(() => result.current.signIn('new.tok'));
    expect(result.current.isAuthed).toBe(true);
    expect(localStorage.getItem('bookee.access-token')).toBe('new.tok');
  });

  it('signOut clears token and state', () => {
    const { result } = renderHook(() => useAuthFlow());
    act(() => result.current.signIn('tok'));
    act(() => result.current.signOut());
    expect(result.current.isAuthed).toBe(false);
    expect(localStorage.getItem('bookee.access-token')).toBeNull();
  });
});

describe('mutation wrappers', () => {
  it('useLoginMutation returns the api-client mutation shape', () => {
    const { result } = renderHook(() => useLoginMutation());
    expect(result.current).toHaveProperty('mutateAsync');
  });
  it('useRegisterMutation returns the api-client mutation shape', () => {
    const { result } = renderHook(() => useRegisterMutation());
    expect(result.current).toHaveProperty('mutateAsync');
  });
});
