import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useDeleteStation: vi.fn(),
}));

import { toast } from 'sonner';
import { useDeleteStation } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { StationDeleteDialog } from './station-delete-dialog';

const mockToast = vi.mocked(toast);
const mockUseDeleteStation = vi.mocked(useDeleteStation);

const sampleStation = {
  id: 1,
  name: 'Ben Xe Mien Dong',
  address: '292 Dinh Bo Linh',
  city: 'Ho Chi Minh',
  lat: 10.8,
  lng: 106.7,
};

describe('StationDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders station name in description', () => {
    mockUseDeleteStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteStation>);
    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText(/Ben Xe Mien Dong/)).toBeInTheDocument();
  });

  it('calls mutateAsync and shows success toast on confirm', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    mockUseDeleteStation.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteStation
    >);

    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 1 });
      expect(mockToast.success).toHaveBeenCalledWith('Station deleted');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows conflict error toast on 409 error', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { status: 409, data: { message: 'Has routes' } } });
    mockUseDeleteStation.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteStation
    >);

    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Has routes');
    });
  });

  it('shows generic error toast on non-conflict error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Server error'));
    mockUseDeleteStation.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteStation
    >);

    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Server error');
    });
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    mockUseDeleteStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteStation>);

    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows Deleting… and disables button when isPending', () => {
    mockUseDeleteStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useDeleteStation>);
    renderWithProviders(
      <StationDeleteDialog open station={sampleStation} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });

  it('does not crash when station is null', () => {
    mockUseDeleteStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteStation>);
    renderWithProviders(<StationDeleteDialog open={false} station={null} onOpenChange={vi.fn()} />);
    // Nothing rendered when open=false
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
