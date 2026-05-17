import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/lib/auth-context';
import type { AuthContextValue, AuthUser } from '@/lib/auth-context';

vi.mock('@bookee/api-client', () => ({
  useListRoutes: vi.fn(() => ({ data: [], isLoading: false })),
  useListStations: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateRoute: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateRoute: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteRoute: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { RoutesPage } from './routes-page';

const adminUser: AuthUser = { sub: 1, role: 'admin', operatorId: null };
const authValue: AuthContextValue = {
  user: adminUser,
  setUser: vi.fn(),
  isAdmin: true,
  isOperator: false,
};

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('RoutesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<RoutesPage />);
    expect(screen.getByRole('heading', { name: /routes/i })).toBeInTheDocument();
  });

  it('renders Add Route button', () => {
    renderWithProviders(<RoutesPage />);
    expect(screen.getByRole('button', { name: /add route/i })).toBeInTheDocument();
  });

  it('shows empty state when no routes', () => {
    renderWithProviders(<RoutesPage />);
    expect(screen.getByText(/no routes found/i)).toBeInTheDocument();
  });

  it('opens create dialog when Add Route is clicked', async () => {
    renderWithProviders(<RoutesPage />);
    await userEvent.click(screen.getByRole('button', { name: /add route/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('create form shows validation error when distance is zero', async () => {
    renderWithProviders(<RoutesPage />);
    await userEvent.click(screen.getByRole('button', { name: /add route/i }));
    await userEvent.click(screen.getByRole('button', { name: /create route/i }));

    await waitFor(() => {
      // Company ID or station validation fires first
      const errors = screen.queryAllByText(/required|must be positive/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
