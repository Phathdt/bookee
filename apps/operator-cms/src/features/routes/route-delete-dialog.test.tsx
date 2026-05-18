import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useDeleteRoute: vi.fn(),
}));

import { toast } from 'sonner';
import { useDeleteRoute } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { RouteDeleteDialog } from './route-delete-dialog';

const mockToast = vi.mocked(toast);
const mockUseDeleteRoute = vi.mocked(useDeleteRoute);

const sampleRoute = {
  id: 5,
  companyId: 3,
  fromStationId: 1,
  toStationId: 2,
  distanceKm: 350,
  durationMinutes: 480,
};

describe('RouteDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteRoute.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteRoute>);
  });

  it('shows route id in description', () => {
    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/#5/)).toBeInTheDocument();
  });

  it('shows companyId in description', () => {
    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/company 3/i)).toBeInTheDocument();
  });

  it('calls mutateAsync and success toast on confirm', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    mockUseDeleteRoute.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteRoute
    >);

    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 5 });
      expect(mockToast.success).toHaveBeenCalledWith('Route deleted');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows conflict toast on 409', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { status: 409, data: { message: 'Has trips' } } });
    mockUseDeleteRoute.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteRoute
    >);

    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Has trips');
    });
  });

  it('shows generic error toast on non-conflict error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ message: 'Unknown error' });
    mockUseDeleteRoute.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteRoute
    >);

    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Unknown error');
    });
  });

  it('shows Deleting… and disables button when isPending', () => {
    mockUseDeleteRoute.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useDeleteRoute>);
    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });

  it('calls onOpenChange when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<RouteDeleteDialog open route={sampleRoute} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
