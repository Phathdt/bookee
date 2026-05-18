import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useDeleteVehicle: vi.fn(),
}));

import { toast } from 'sonner';
import { useDeleteVehicle } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { VehicleDeleteDialog } from './vehicle-delete-dialog';

const mockToast = vi.mocked(toast);
const mockUseDeleteVehicle = vi.mocked(useDeleteVehicle);

const sampleVehicle = {
  id: 10,
  companyId: 3,
  plateNumber: '51B-123.45',
  type: 'Sleeper',
  seatLayoutId: 1,
  totalSeats: 40,
};

describe('VehicleDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteVehicle.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteVehicle>);
  });

  it('shows vehicle plate in description', () => {
    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText(/51B-123\.45/)).toBeInTheDocument();
  });

  it('calls mutateAsync and success toast on confirm', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    mockUseDeleteVehicle.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteVehicle
    >);

    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ id: 10 });
      expect(mockToast.success).toHaveBeenCalledWith('Vehicle deleted');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows conflict toast on 409', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { status: 409, data: { message: 'Has trips' } } });
    mockUseDeleteVehicle.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteVehicle
    >);

    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Has trips');
    });
  });

  it('shows generic error on non-conflict error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ message: 'Unknown' });
    mockUseDeleteVehicle.mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<
      typeof useDeleteVehicle
    >);

    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Unknown');
    });
  });

  it('shows Deleting… and disables button when isPending', () => {
    mockUseDeleteVehicle.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useDeleteVehicle>);
    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });

  it('calls onOpenChange on cancel click', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <VehicleDeleteDialog open vehicle={sampleVehicle} onOpenChange={onOpenChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
