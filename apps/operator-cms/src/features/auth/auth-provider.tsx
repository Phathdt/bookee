import { useState } from 'react';

import type { AuthContextValue, AuthUser } from '@/features/auth/auth-context';
import { AuthContext } from '@/features/auth/auth-context';
import { decodeJwtPayload } from '@/lib/jwt';
import { getStoredToken } from '@/lib/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

function resolveInitialUser(): AuthUser | null {
  const token = getStoredToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return payload as AuthUser;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(resolveInitialUser);

  const value: AuthContextValue = {
    user,
    setUser,
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator' || user?.role === 'driver',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
