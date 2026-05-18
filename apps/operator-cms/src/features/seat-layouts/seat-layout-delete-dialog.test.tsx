import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useDeleteSeatLayout: vi.fn(),
}));

import { toast } from 'sonner';
import { useDeleteSeatLayout } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { SeatLayoutDeleteDialog } from './seat-layout-delete-dialog';

const mockToast = vi.mocked(toast);
const mockUseDeleteSeatLayout = vi.mocked(useDeleteSeatLayout);

const sampleLayout = { id: 2, name: 'Sleeper 40', rows: 10, cols: 4, seats: [] };

describe('SeatLayoutDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteSeatLayout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteSeatLayout>);
  });

  it('shows layout name in description', () => {
    renderWithProviders(
      <SeatLayoutDeleteDialog open layout={sampleLayout} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText(/Sleeper 40/)).toBeInTheDocument();
  });

  it('calls mutateAsync and success toast on confirm', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    mockUseDeleteSeatLayout.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteSeatLayout>);

    renderWithProviders(
      <SeatLayoutDeleteDialog open layout={sampleLayout} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 2 });
      expect(mockToast.success).toHaveBeenCalledWith('Seat layout deleted');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows conflict error toast on 409', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { status: 409, data: { message: 'In use' } } });
    mockUseDeleteSeatLayout.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteSeatLayout>);

    renderWithProviders(
      <SeatLayoutDeleteDialog open layout={sampleLayout} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('In use');
    });
  });

  it('shows generic error toast on non-conflict error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ message: 'Network failure' });
    mockUseDeleteSeatLayout.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteSeatLayout>);

    renderWithProviders(
      <SeatLayoutDeleteDialog open layout={sampleLayout} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network failure');
    });
  });

  it('shows Deleting… and disables button when isPending', () => {
    mockUseDeleteSeatLayout.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useDeleteSeatLayout>);
    renderWithProviders(
      <SeatLayoutDeleteDialog open layout={sampleLayout} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});
