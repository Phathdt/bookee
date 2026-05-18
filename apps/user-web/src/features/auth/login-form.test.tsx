import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
const mockState = { isPending: false, error: null as { message?: string } | null };
vi.mock('@bookee/api-client', () => ({
  useLoginUser: () => ({
    mutateAsync,
    isPending: mockState.isPending,
    error: mockState.error,
  }),
  setAuthToken: vi.fn(),
}));

import { renderWithProviders } from '@/test/test-utils';

import { LoginForm } from './login-form';

beforeEach(() => {
  mutateAsync.mockReset();
  mockState.isPending = false;
  mockState.error = null;
});

describe('LoginForm', () => {
  it('shows validation errors for empty submission', async () => {
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    expect(await screen.findByText(/bắt buộc/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits and invokes onSuccess with access token', async () => {
    mutateAsync.mockResolvedValue({ tokens: { accessToken: 'tok123' } });
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email hoặc số điện thoại/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/mật khẩu/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('tok123'));
    expect(mutateAsync).toHaveBeenCalledWith({
      data: { identifier: 'a@b.co', password: 'password123' },
    });
  });

  it('shows server error message', () => {
    mockState.error = { message: 'Invalid credentials' };
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('disables submit button while pending', () => {
    mockState.isPending = true;
    renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: /đang xử lý/i })).toBeDisabled();
  });
});
