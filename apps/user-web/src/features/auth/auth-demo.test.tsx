import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@bookee/api-client', () => ({
  useLoginUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useRegisterUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useGetMe: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateMe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  setAuthToken: vi.fn(),
}));

import { renderWithProviders } from '@/test/test-utils';

import { AuthDemo } from './auth-demo';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('AuthDemo', () => {
  it('defaults to login mode', () => {
    renderWithProviders(<AuthDemo />);
    expect(screen.getByRole('button', { name: /^đăng nhập$/i })).toBeInTheDocument();
  });

  it('switches to register mode', async () => {
    renderWithProviders(<AuthDemo />);
    await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
    expect(screen.getByRole('button', { name: /tạo tài khoản/i })).toBeInTheDocument();
  });

  it('switches back to login mode', async () => {
    renderWithProviders(<AuthDemo />);
    await userEvent.click(screen.getByRole('button', { name: /^register$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByRole('button', { name: /^đăng nhập$/i })).toBeInTheDocument();
  });

  it('renders profile panel when token already in storage', () => {
    localStorage.setItem('bookee.access-token', 'tok');
    renderWithProviders(<AuthDemo />);
    expect(screen.getByText(/authenticated profile/i)).toBeInTheDocument();
  });
});
