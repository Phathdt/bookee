import { useLoginUser, useRegisterUser } from '@bookee/api-client';
import { useState } from 'react';

import { clearToken, getStoredToken, saveToken } from '@/lib/auth-store';

export type AuthMode = 'login' | 'register';

interface UseAuthFlowResult {
  token: string | null;
  isAuthed: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

export function useAuthFlow(): UseAuthFlowResult {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  function signIn(next: string) {
    saveToken(next);
    setToken(next);
  }
  function signOut() {
    clearToken();
    setToken(null);
  }

  return { token, isAuthed: token !== null, signIn, signOut };
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export function useLoginMutation() {
  return useLoginUser();
}

export function useRegisterMutation() {
  return useRegisterUser();
}
