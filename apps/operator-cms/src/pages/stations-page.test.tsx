import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/lib/auth-context';
import type { AuthContextValue, AuthUser } from '@/lib/auth-context';

// Mock the api-client hooks
vi.mock('@bookee/api-client', () => ({
  useListStations: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateStation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateStation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteStation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { StationsPage } from './stations-page';

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

describe('StationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<StationsPage />);
    expect(screen.getByRole('heading', { name: /stations/i })).toBeInTheDocument();
  });

  it('renders Add Station button', () => {
    renderWithProviders(<StationsPage />);
    expect(screen.getByRole('button', { name: /add station/i })).toBeInTheDocument();
  });

  it('shows empty state when no stations', () => {
    renderWithProviders(<StationsPage />);
    expect(screen.getByText(/no stations found/i)).toBeInTheDocument();
  });

  it('opens create dialog when Add Station is clicked', async () => {
    renderWithProviders(<StationsPage />);
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Dialog title "Add Station" appears inside the dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/add station/i);
  });

  it('create form shows validation errors on empty submit', async () => {
    renderWithProviders(<StationsPage />);
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));

    // Clear the form fields to ensure empty values trigger validation
    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.clear(nameInput);

    await userEvent.click(screen.getByRole('button', { name: /create station/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
