import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useCreateVehicle: vi.fn(),
  useUpdateVehicle: vi.fn(),
  useListSeatLayouts: vi.fn(),
}));

import { toast } from 'sonner';
import { useCreateVehicle, useUpdateVehicle, useListSeatLayouts } from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { VehicleFormDialog } from './vehicle-form-dialog';

const mockToast = vi.mocked(toast);

const sampleLayouts = [
  { id: 1, name: 'Sleeper 40', rows: 10, cols: 4, seats: [] },
  { id: 2, name: 'Express 20', rows: 5, cols: 4, seats: [] },
];

const sampleVehicle = {
  id: 1,
  companyId: 3,
  plateNumber: '51B-123.45',
  type: 'Sleeper',
  seatLayoutId: 1,
  totalSeats: 40,
};

function setupMocks(createImpl = vi.fn(), updateImpl = vi.fn()) {
  vi.mocked(useCreateVehicle).mockReturnValue({
    mutateAsync: createImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateVehicle>);
  vi.mocked(useUpdateVehicle).mockReturnValue({
    mutateAsync: updateImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateVehicle>);
  vi.mocked(useListSeatLayouts).mockReturnValue({ data: sampleLayouts } as unknown as ReturnType<
    typeof useListSeatLayouts
  >);
}

describe('VehicleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Add Vehicle title in create mode', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
  });

  it('renders Edit Vehicle title in edit mode', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={sampleVehicle} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Edit Vehicle')).toBeInTheDocument();
  });

  it('pre-fills fields in edit mode', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={sampleVehicle} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByDisplayValue('51B-123.45')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sleeper')).toBeInTheDocument();
  });

  it('hides Company ID field in edit mode', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={sampleVehicle} />, {
      auth: makeAuthValue(),
    });
    expect(screen.queryByLabelText(/company id/i)).not.toBeInTheDocument();
  });

  it('shows Company ID field disabled for operator user', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(5),
    });
    expect(screen.getByLabelText(/company id/i)).toBeDisabled();
  });

  it('shows Company ID field enabled for admin user', () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByLabelText(/company id/i)).not.toBeDisabled();
  });

  it('shows validation error on empty submit', async () => {
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    // Use fireEvent to bypass Radix body scroll-lock pointer-events:none
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      // Zod fires for companyId=0 (Company is required) or plateNumber (Plate number is required)
      expect(document.querySelector('[data-slot="form-message"]')).not.toBeNull();
    });
  });

  it('calls createMutation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(3),
    });

    await userEvent.type(screen.getByLabelText(/plate number/i), '51B-999.99');
    await userEvent.type(screen.getByLabelText(/^Type$/i), 'Express');

    const totalSeatsInput = screen.getByLabelText(/total seats/i);
    await userEvent.clear(totalSeatsInput);
    await userEvent.type(totalSeatsInput, '20');

    // Select layout via option role
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => screen.getByRole('option', { name: /Sleeper 40/ }));
    await userEvent.click(screen.getByRole('option', { name: /Sleeper 40/ }));

    await userEvent.click(screen.getByRole('button', { name: /create vehicle/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Vehicle created');
    });
  });

  it('calls updateMutation on edit submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={sampleVehicle} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Vehicle updated');
    });
  });

  it('shows error toast on failure', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: 'Duplicate plate' } } });
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} vehicle={sampleVehicle} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Duplicate plate');
    });
  });

  it('shows Saving… when isPending', () => {
    vi.mocked(useCreateVehicle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateVehicle>);
    vi.mocked(useUpdateVehicle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateVehicle>);
    vi.mocked(useListSeatLayouts).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListSeatLayouts
    >);
    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<VehicleFormDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates companyId via number input onChange for admin', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<VehicleFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });

    // Admin can type into Company ID
    const companyInput = screen.getByLabelText(/company id/i);
    await userEvent.clear(companyInput);
    await userEvent.type(companyInput, '7');

    await userEvent.type(screen.getByLabelText(/plate number/i), '51B-999.88');
    await userEvent.type(screen.getByLabelText(/^Type$/i), 'Express');

    const totalSeatsInput = screen.getByLabelText(/total seats/i);
    await userEvent.clear(totalSeatsInput);
    await userEvent.type(totalSeatsInput, '20');

    // Select layout
    await userEvent.click(screen.getByRole('combobox'));
    await waitFor(() => screen.getByRole('option', { name: /Sleeper 40/ }));
    await userEvent.click(screen.getByRole('option', { name: /Sleeper 40/ }));

    await userEvent.click(screen.getByRole('button', { name: /create vehicle/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 7 }),
        }),
      );
    });
  });
});
