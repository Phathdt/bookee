import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext, type AuthContextValue, type AuthUser } from '@/features/auth/auth-context';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const adminUser: AuthUser = { sub: 1, role: 'admin', operatorId: null };
  return {
    user: adminUser,
    setUser: () => {},
    isAdmin: true,
    isOperator: false,
    ...overrides,
  };
}

export function makeOperatorAuth(operatorId = 7): AuthContextValue {
  return makeAuthValue({
    user: { sub: 2, role: 'operator', operatorId },
    isAdmin: false,
    isOperator: true,
  });
}

interface ProviderProps {
  children: ReactNode;
  initialPath?: string;
  queryClient?: QueryClient;
  auth?: AuthContextValue | null;
}

export function TestProviders({
  children,
  initialPath = '/',
  queryClient,
  auth = makeAuthValue(),
}: ProviderProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPath?: string;
  queryClient?: QueryClient;
  auth?: AuthContextValue | null;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialPath, queryClient, auth, ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialPath={initialPath} queryClient={queryClient} auth={auth}>
        {children}
      </TestProviders>
    ),
    ...options,
  });
}
