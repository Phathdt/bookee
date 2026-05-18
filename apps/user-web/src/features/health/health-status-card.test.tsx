import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetch = vi.fn();
const state: { data: unknown; isLoading: boolean; error: unknown } = {
  data: undefined,
  isLoading: false,
  error: null,
};
vi.mock('@bookee/api-client', () => ({
  useGetHealth: () => ({
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    refetch,
  }),
}));

import { renderWithProviders } from '@/test/test-utils';

import { HealthStatusCard } from './health-status-card';

beforeEach(() => {
  state.data = undefined;
  state.isLoading = false;
  state.error = null;
  refetch.mockReset();
});

describe('HealthStatusCard', () => {
  it('renders loading text', () => {
    state.isLoading = true;
    renderWithProviders(<HealthStatusCard />);
    expect(screen.getByText(/đang kiểm tra/i)).toBeInTheDocument();
  });

  it('renders error when unreachable', () => {
    state.error = new Error('boom');
    renderWithProviders(<HealthStatusCard />);
    expect(screen.getByText(/không kết nối được/i)).toBeInTheDocument();
  });

  it('renders status badge with data', () => {
    state.data = { status: 'ok' };
    renderWithProviders(<HealthStatusCard />);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('refetches on button click', async () => {
    state.data = { status: 'ok' };
    renderWithProviders(<HealthStatusCard />);
    await userEvent.click(screen.getByRole('button', { name: /tải lại/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
