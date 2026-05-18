import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@bookee/api-client', () => ({
  useGetHealth: () => ({ data: undefined, isLoading: true, error: null, refetch: vi.fn() }),
  useLoginUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useRegisterUser: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useGetMe: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateMe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  setAuthToken: vi.fn(),
}));

import { renderWithProviders } from '@/test/test-utils';

import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('renders Bookee heading, health card, and auth demo', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole('heading', { name: /bookee/i })).toBeInTheDocument();
    expect(screen.getByText(/trạng thái backend/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^đăng nhập$/i })).toBeInTheDocument();
  });
});
