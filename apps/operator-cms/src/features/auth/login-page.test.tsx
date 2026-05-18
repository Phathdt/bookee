import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@bookee/api-client', () => ({
  useLoginUser: vi.fn(),
}));

vi.mock('@/lib/auth-store', () => ({
  saveToken: vi.fn(),
  getStoredToken: vi.fn(() => null),
  clearToken: vi.fn(),
  hydrateAuth: vi.fn(),
}));

vi.mock('@/lib/jwt', () => ({
  decodeJwtPayload: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { toast } from 'sonner';
import { useLoginUser } from '@bookee/api-client';
import { saveToken } from '@/lib/auth-store';
import { decodeJwtPayload } from '@/lib/jwt';

import { renderWithProviders } from '@/test/test-utils';
import { LoginPage } from './login-page';

const mockUseLoginUser = vi.mocked(useLoginUser);
const mockSaveToken = vi.mocked(saveToken);
const mockDecodeJwtPayload = vi.mocked(decodeJwtPayload);
const mockToast = vi.mocked(toast);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupMutateAsync(impl: () => Promise<unknown>) {
    mockUseLoginUser.mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(impl),
      isPending: false,
    } as unknown as ReturnType<typeof useLoginUser>);
  }

  it('renders the login form', () => {
    mockUseLoginUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLoginUser>);
    renderWithProviders(<LoginPage />);
    expect(screen.getByText('Bookee CMS')).toBeInTheDocument();
    expect(screen.getByLabelText(/phone or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    mockUseLoginUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLoginUser>);
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/phone or email is required/i)).toBeInTheDocument();
    });
  });

  it('shows password validation error for short password', async () => {
    mockUseLoginUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLoginUser>);
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('calls mutateAsync with form values on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      tokens: { accessToken: 'tok.ey.abc' },
      user: { role: 'admin' },
    });
    mockUseLoginUser.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useLoginUser
    >);
    mockDecodeJwtPayload.mockReturnValue({ sub: 1, role: 'admin', operatorId: null });

    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        data: { identifier: 'admin@test.com', password: 'password123' },
      });
    });
  });

  it('saves token and navigates on success', async () => {
    setupMutateAsync(() =>
      Promise.resolve({
        tokens: { accessToken: 'tok.ey.abc' },
        user: { role: 'admin' },
      }),
    );
    mockDecodeJwtPayload.mockReturnValue({ sub: 1, role: 'admin', operatorId: null });

    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSaveToken).toHaveBeenCalledWith('tok.ey.abc');
      expect(mockToast.success).toHaveBeenCalledWith('Signed in successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error toast on login failure', async () => {
    setupMutateAsync(() =>
      Promise.reject({ response: { data: { message: 'Invalid credentials' } } }),
    );

    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'wrong@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('shows generic error toast when no response message', async () => {
    setupMutateAsync(() => Promise.reject(new Error('Network error')));

    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'test@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it('shows isPending state on button', () => {
    mockUseLoginUser.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useLoginUser>);
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('navigates to / for operator role after login', async () => {
    setupMutateAsync(() =>
      Promise.resolve({
        tokens: { accessToken: 'tok.ey.op' },
        user: { role: 'operator' },
      }),
    );
    mockDecodeJwtPayload.mockReturnValue({ sub: 2, role: 'operator', operatorId: 5 });

    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'op@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'operpass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('skips setUser when decodeJwtPayload returns null', async () => {
    setupMutateAsync(() =>
      Promise.resolve({
        tokens: { accessToken: 'bad.token' },
        user: { role: 'admin' },
      }),
    );
    mockDecodeJwtPayload.mockReturnValue(null);

    const setUser = vi.fn();
    renderWithProviders(<LoginPage />, {
      auth: { user: null, setUser, isAdmin: false, isOperator: false },
    });
    await userEvent.type(screen.getByLabelText(/phone or email/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Signed in successfully');
      // setUser should NOT be called when payload is null
      expect(setUser).not.toHaveBeenCalled();
    });
  });
});
