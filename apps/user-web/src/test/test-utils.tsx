import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderProps {
  children: ReactNode;
  initialPath?: string;
  queryClient?: QueryClient;
}

export function TestProviders({ children, initialPath = '/', queryClient }: ProviderProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPath?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialPath, queryClient, ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialPath={initialPath} queryClient={queryClient}>
        {children}
      </TestProviders>
    ),
    ...options,
  });
}
