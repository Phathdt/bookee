import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/lib/auth-context';
import type { AuthContextValue, AuthUser } from '@/lib/auth-context';

vi.mock('@bookee/api-client', () => ({
  useListVehicles: vi.fn(() => ({ data: [], isLoading: false })),
  useListSeatLayouts: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateVehicle: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateVehicle: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteVehicle: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { VehiclesPage } from './vehicles-page';

const operatorUser: AuthUser = { sub: 2, role: 'operator', operatorId: 5 };
const authValue: AuthContextValue = {
  user: operatorUser,
  setUser: vi.fn(),
  isAdmin: false,
  isOperator: true,
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

describe('VehiclesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<VehiclesPage />);
    expect(screen.getByRole('heading', { name: /vehicles/i })).toBeInTheDocument();
  });

  it('renders Add Vehicle button', () => {
    renderWithProviders(<VehiclesPage />);
    expect(screen.getByRole('button', { name: /add vehicle/i })).toBeInTheDocument();
  });

  it('shows empty state when no vehicles', () => {
    renderWithProviders(<VehiclesPage />);
    expect(screen.getByText(/no vehicles found/i)).toBeInTheDocument();
  });

  it('opens create dialog when Add Vehicle is clicked', async () => {
    renderWithProviders(<VehiclesPage />);
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('create form dialog can be opened and closed', async () => {
    renderWithProviders(<VehiclesPage />);
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Dialog contains form fields
    expect(screen.getByLabelText(/plate number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();

    // Cancel closes the dialog
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
