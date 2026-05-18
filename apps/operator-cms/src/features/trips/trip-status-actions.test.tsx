import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useSetTripStatus: vi.fn(),
}));

import { toast } from 'sonner';
import { useSetTripStatus } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { TripStatusActions } from './trip-status-actions';

const mockToast = vi.mocked(toast);
const mockUseSetTripStatus = vi.mocked(useSetTripStatus);

function makeTrip(status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') {
  return {
    id: 42,
    routeId: 1,
    vehicleId: 1,
    departureTime: '2025-06-01T08:00:00Z',
    arrivalTime: '2025-06-01T16:00:00Z',
    basePrice: 150000,
    status,
  };
}

describe('TripStatusActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSetTripStatus.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSetTripStatus>);
  });

  it('renders Start and Cancel buttons for scheduled trip', () => {
    renderWithProviders(<TripStatusActions trip={makeTrip('scheduled')} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders Complete and Cancel buttons for in_progress trip', () => {
    renderWithProviders(<TripStatusActions trip={makeTrip('in_progress')} />);
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders nothing for completed trip', () => {
    const { container } = renderWithProviders(<TripStatusActions trip={makeTrip('completed')} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for cancelled trip', () => {
    const { container } = renderWithProviders(<TripStatusActions trip={makeTrip('cancelled')} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls mutateAsync with in_progress when Start is clicked', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseSetTripStatus.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useSetTripStatus
    >);

    renderWithProviders(<TripStatusActions trip={makeTrip('scheduled')} />);
    await userEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 42, data: { status: 'in_progress' } });
      expect(mockToast.success).toHaveBeenCalledWith('Trip #42 → in progress');
    });
  });

  it('calls mutateAsync with cancelled when Cancel is clicked on scheduled trip', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseSetTripStatus.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useSetTripStatus
    >);

    renderWithProviders(<TripStatusActions trip={makeTrip('scheduled')} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 42, data: { status: 'cancelled' } });
    });
  });

  it('calls mutateAsync with completed when Complete is clicked', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseSetTripStatus.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useSetTripStatus
    >);

    renderWithProviders(<TripStatusActions trip={makeTrip('in_progress')} />);
    await userEvent.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 42, data: { status: 'completed' } });
      expect(mockToast.success).toHaveBeenCalledWith('Trip #42 → completed');
    });
  });

  it('shows error toast on transition failure', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: 'Transition denied' } } });
    mockUseSetTripStatus.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useSetTripStatus
    >);

    renderWithProviders(<TripStatusActions trip={makeTrip('scheduled')} />);
    await userEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Transition denied');
    });
  });

  it('disables buttons when isPending', () => {
    mockUseSetTripStatus.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useSetTripStatus>);
    renderWithProviders(<TripStatusActions trip={makeTrip('scheduled')} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
