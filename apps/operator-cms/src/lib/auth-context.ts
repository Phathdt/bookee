import { createContext, useContext } from 'react';

import type { JwtPayload } from './jwt';

export interface AuthUser extends JwtPayload {
  sub: number;
  role: 'customer' | 'operator' | 'driver' | 'admin';
  operatorId: number | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAdmin: boolean;
  isOperator: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
