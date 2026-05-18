import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
const mockState = { isPending: false, error: null as { message?: string } | null };
vi.mock('@bookee/api-client', () => ({
  useRegisterUser: () => ({
    mutateAsync,
    isPending: mockState.isPending,
    error: mockState.error,
  }),
  setAuthToken: vi.fn(),
}));

import { renderWithProviders } from '@/test/test-utils';

import { RegisterForm } from './register-form';

beforeEach(() => {
  mutateAsync.mockReset();
  mockState.isPending = false;
  mockState.error = null;
});

describe('RegisterForm', () => {
  it('shows validation errors on empty submit', async () => {
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));
    expect(await screen.findByText(/họ và tên là bắt buộc/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects short password', async () => {
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/họ và tên/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/số điện thoại/i), '0901234567');
    await userEvent.type(screen.getByLabelText(/^email$/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/mật khẩu/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));
    expect(await screen.findByText(/mật khẩu phải ít nhất 8 ký tự/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits valid payload and calls onSuccess', async () => {
    mutateAsync.mockResolvedValue({ tokens: { accessToken: 'newtok' } });
    const onSuccess = vi.fn();
    renderWithProviders(<RegisterForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/họ và tên/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/số điện thoại/i), '0901234567');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/mật khẩu/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('newtok'));
  });

  it('renders server error', () => {
    mockState.error = { message: 'Email taken' };
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Email taken')).toBeInTheDocument();
  });

  it('disables submit while pending', () => {
    mockState.isPending = true;
    renderWithProviders(<RegisterForm onSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: /đang xử lý/i })).toBeDisabled();
  });
});
