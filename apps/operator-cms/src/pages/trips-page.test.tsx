import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/lib/auth-context';
import type { AuthContextValue, AuthUser } from '@/lib/auth-context';

vi.mock('@bookee/api-client', () => ({
  useListTrips: vi.fn(() => ({ data: [], isLoading: false })),
  useListRoutes: vi.fn(() => ({ data: [], isLoading: false })),
  useListVehicles: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateTrip: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBulkCreateTrips: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSetTripStatus: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { TripsPage } from './trips-page';

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

describe('TripsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<TripsPage />);
    expect(screen.getByRole('heading', { name: /trips/i })).toBeInTheDocument();
  });

  it('renders Add Trip and Bulk Create buttons', () => {
    renderWithProviders(<TripsPage />);
    expect(screen.getByRole('button', { name: /add trip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk create/i })).toBeInTheDocument();
  });

  it('shows empty state when no trips', () => {
    renderWithProviders(<TripsPage />);
    expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
  });

  it('opens create dialog when Add Trip is clicked', async () => {
    renderWithProviders(<TripsPage />);
    await userEvent.click(screen.getByRole('button', { name: /add trip/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens bulk create dialog when Bulk Create is clicked', async () => {
    renderWithProviders(<TripsPage />);
    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/bulk create trips/i)).toBeInTheDocument();
  });

  it('create trip form shows validation error when submitting without route', async () => {
    renderWithProviders(<TripsPage />);
    await userEvent.click(screen.getByRole('button', { name: /add trip/i }));
    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));

    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
