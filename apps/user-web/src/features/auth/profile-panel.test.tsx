import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMeState: {
  data: { id: number; name: string; email: string; phone: string; role: string } | undefined;
  isLoading: boolean;
  error: unknown;
} = { data: undefined, isLoading: false, error: null };
const updateMutateAsync = vi.fn();
const refetch = vi.fn();
const mockUpdate = { isPending: false };

vi.mock('@bookee/api-client', () => ({
  useGetMe: () => ({
    data: getMeState.data,
    isLoading: getMeState.isLoading,
    error: getMeState.error,
    refetch,
  }),
  useUpdateMe: () => ({ mutateAsync: updateMutateAsync, isPending: mockUpdate.isPending }),
}));

import { renderWithProviders } from '@/test/test-utils';

import { ProfilePanel } from './profile-panel';

beforeEach(() => {
  getMeState.data = undefined;
  getMeState.isLoading = false;
  getMeState.error = null;
  updateMutateAsync.mockReset();
  refetch.mockReset();
  mockUpdate.isPending = false;
});

describe('ProfilePanel', () => {
  it('shows loading state', () => {
    getMeState.isLoading = true;
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message from server', () => {
    getMeState.error = { message: 'forbidden' };
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    expect(screen.getByText('forbidden')).toBeInTheDocument();
  });

  it('falls back to default error message', () => {
    getMeState.error = {};
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
  });

  it('renders profile info when data loaded', () => {
    getMeState.data = {
      id: 1,
      name: 'Alice',
      email: 'a@b.co',
      phone: '0901234567',
      role: 'customer',
    };
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('a@b.co')).toBeInTheDocument();
  });

  it('submits rename, resets form, calls refetch', async () => {
    getMeState.data = {
      id: 1,
      name: 'A',
      email: 'a@b.co',
      phone: '09',
      role: 'customer',
    };
    updateMutateAsync.mockResolvedValue({});
    refetch.mockResolvedValue({});
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/new display name/i), 'NewName');
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({ data: { name: 'NewName' } }),
    );
    expect(refetch).toHaveBeenCalled();
  });

  it('shows validation error for empty name', async () => {
    getMeState.data = {
      id: 1,
      name: 'A',
      email: 'a@b.co',
      phone: '09',
      role: 'customer',
    };
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(await screen.findByText(/không được trống/i)).toBeInTheDocument();
  });

  it('disables rename button while update pending', () => {
    mockUpdate.isPending = true;
    renderWithProviders(<ProfilePanel onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: /rename/i })).toBeDisabled();
  });

  it('invokes onLogout', async () => {
    const onLogout = vi.fn();
    renderWithProviders(<ProfilePanel onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
