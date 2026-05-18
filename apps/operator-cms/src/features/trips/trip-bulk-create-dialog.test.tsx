import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useBulkCreateTrips: vi.fn(),
  useListRoutes: vi.fn(),
  useListVehicles: vi.fn(),
}));

import { toast } from 'sonner';
import { useBulkCreateTrips, useListRoutes, useListVehicles } from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { TripBulkCreateDialog } from './trip-bulk-create-dialog';

const mockToast = vi.mocked(toast);

const sampleRoutes = [
  { id: 1, companyId: 3, fromStationId: 1, toStationId: 2, distanceKm: 350, durationMinutes: 480 },
];
const sampleVehicles = [
  {
    id: 1,
    companyId: 3,
    plateNumber: '51B-123.45',
    type: 'Sleeper',
    seatLayoutId: 1,
    totalSeats: 40,
  },
];

function setupMocks(bulkImpl = vi.fn()) {
  vi.mocked(useBulkCreateTrips).mockReturnValue({
    mutateAsync: bulkImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useBulkCreateTrips>);
  vi.mocked(useListRoutes).mockReturnValue({ data: sampleRoutes } as unknown as ReturnType<
    typeof useListRoutes
  >);
  vi.mocked(useListVehicles).mockReturnValue({ data: sampleVehicles } as unknown as ReturnType<
    typeof useListVehicles
  >);
}

describe('TripBulkCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders dialog title', () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Bulk Create Trips')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Route')).toBeInTheDocument();
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByLabelText(/base price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/daily departure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration.*minutes/i)).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required|positive/i).length).toBeGreaterThan(0);
    });
  });

  it('shows date range validation error when end < start', async () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });

    // Select route
    const routeTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    // Select vehicle
    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    // Set dateStart after dateEnd
    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    await userEvent.type(startInput, '2025-12-31');
    await userEvent.type(endInput, '2025-01-01');

    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(screen.getByText(/end date must be on or after start date/i)).toBeInTheDocument();
    });
  });

  it('calls bulkMutation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);
    const onOpenChange = vi.fn();

    renderWithProviders(<TripBulkCreateDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });

    // Select route
    const routeTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    // Select vehicle
    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    await userEvent.type(startInput, '2025-06-01');
    await userEvent.type(endInput, '2025-06-30');

    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Trips bulk-created successfully');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows error toast on bulk create failure', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: 'Invalid range' } } });
    setupMocks(mutateAsync);

    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });

    const routeTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    await userEvent.type(screen.getByLabelText(/start date/i), '2025-06-01');
    await userEvent.type(screen.getByLabelText(/end date/i), '2025-06-30');

    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Invalid range');
    });
  });

  it('shows Creating… when isPending', () => {
    vi.mocked(useBulkCreateTrips).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useBulkCreateTrips>);
    vi.mocked(useListRoutes).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListRoutes
    >);
    vi.mocked(useListVehicles).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListVehicles
    >);
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('passes companyId from operator user to routes and vehicles', () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(5),
    });
    expect(vi.mocked(useListRoutes)).toHaveBeenCalledWith({ companyId: 5 });
    expect(vi.mocked(useListVehicles)).toHaveBeenCalledWith({ companyId: 5 });
  });

  it('passes companyId=undefined for admin user', () => {
    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });
    expect(vi.mocked(useListRoutes)).toHaveBeenCalledWith({ companyId: undefined });
    expect(vi.mocked(useListVehicles)).toHaveBeenCalledWith({ companyId: undefined });
  });

  it('updates basePrice and tripDurationMinutes via number inputs', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<TripBulkCreateDialog open onOpenChange={vi.fn()} />, {
      auth: makeAuthValue(),
    });

    // Select route
    const routeTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    // Select vehicle
    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    // Set dates
    await userEvent.type(screen.getByLabelText(/start date/i), '2025-06-01');
    await userEvent.type(screen.getByLabelText(/end date/i), '2025-06-30');

    // Update base price
    const priceInput = screen.getByLabelText(/base price/i);
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '150000');

    // Update duration
    const durationInput = screen.getByLabelText(/duration.*minutes/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '300');

    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ basePrice: 150000, tripDurationMinutes: 300 }),
        }),
      );
    });
  });
});
