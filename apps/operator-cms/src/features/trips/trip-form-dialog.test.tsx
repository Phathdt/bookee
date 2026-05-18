import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useCreateTrip: vi.fn(),
  useListRoutes: vi.fn(),
  useListVehicles: vi.fn(),
}));

import { toast } from 'sonner';
import { useCreateTrip, useListRoutes, useListVehicles } from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { TripFormDialog } from './trip-form-dialog';

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

const sampleTrip = {
  id: 5,
  routeId: 1,
  vehicleId: 1,
  departureTime: '2025-06-01T08:00:00Z',
  arrivalTime: '2025-06-01T16:00:00Z',
  basePrice: 150000,
  status: 'scheduled' as const,
};

function setupMocks(createImpl = vi.fn()) {
  vi.mocked(useCreateTrip).mockReturnValue({
    mutateAsync: createImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateTrip>);
  vi.mocked(useListRoutes).mockReturnValue({ data: sampleRoutes } as unknown as ReturnType<
    typeof useListRoutes
  >);
  vi.mocked(useListVehicles).mockReturnValue({ data: sampleVehicles } as unknown as ReturnType<
    typeof useListVehicles
  >);
}

describe('TripFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Add Trip title in create mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByText('Add Trip')).toBeInTheDocument();
  });

  it('renders Trip Details title in view mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} trip={sampleTrip} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Trip Details')).toBeInTheDocument();
  });

  it('shows Close button (not Create) in view mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} trip={sampleTrip} />, {
      auth: makeAuthValue(),
    });
    // DialogContent X button + footer Close button — at least one visible Close, no Create trip
    expect(screen.getAllByRole('button', { name: /close/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /create trip/i })).not.toBeInTheDocument();
  });

  it('shows Cancel and Create Trip buttons in create mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument();
  });

  it('disables route and vehicle selects in view mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} trip={sampleTrip} />, {
      auth: makeAuthValue(),
    });
    const combos = screen.getAllByRole('combobox');
    combos.forEach((c) => expect(c).toBeDisabled());
  });

  it('shows validation errors on empty create submit', async () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required|positive/i).length).toBeGreaterThan(0);
    });
  });

  it('calls createMutation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);
    const onOpenChange = vi.fn();

    renderWithProviders(<TripFormDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });

    // Select route
    const [routeTrigger, vehicleTrigger] = screen.getAllByRole('combobox') as [
      HTMLElement,
      HTMLElement,
    ];
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    // Select vehicle
    await userEvent.click(vehicleTrigger);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    // Set datetime fields
    const [deptInput, arrInput] = screen.getAllByDisplayValue('') as [HTMLElement, HTMLElement];
    await userEvent.type(deptInput, '2025-06-01T08:00');
    await userEvent.type(arrInput, '2025-06-01T16:00');

    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Trip created');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows error toast on create failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ response: { data: { message: 'Conflict' } } });
    setupMocks(mutateAsync);

    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });

    const [routeTrigger, vehicleTrigger] = screen.getAllByRole('combobox') as [
      HTMLElement,
      HTMLElement,
    ];
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    await userEvent.click(vehicleTrigger);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    const [deptInput, arrInput] = screen.getAllByDisplayValue('') as [HTMLElement, HTMLElement];
    await userEvent.type(deptInput, '2025-06-01T08:00');
    await userEvent.type(arrInput, '2025-06-01T16:00');

    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Conflict');
    });
  });

  it('shows Creating… when isPending', () => {
    vi.mocked(useCreateTrip).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateTrip>);
    vi.mocked(useListRoutes).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListRoutes
    >);
    vi.mocked(useListVehicles).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListVehicles
    >);
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<TripFormDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('passes companyId from operator user', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(5),
    });
    expect(vi.mocked(useListRoutes)).toHaveBeenCalledWith({ companyId: 5 });
    expect(vi.mocked(useListVehicles)).toHaveBeenCalledWith({ companyId: 5 });
  });

  it('pre-fills departure and arrival times in view mode', () => {
    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} trip={sampleTrip} />, {
      auth: makeAuthValue(),
    });
    // toDatetimeLocal strips Z and takes first 16 chars: "2025-06-01T08:00"
    expect(screen.getByDisplayValue('2025-06-01T08:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-01T16:00')).toBeInTheDocument();
  });

  it('updates basePrice via number input onChange', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<TripFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });

    const [routeTrigger, vehicleTrigger] = screen.getAllByRole('combobox') as [
      HTMLElement,
      HTMLElement,
    ];
    await userEvent.click(routeTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Route #1/ }));
    await userEvent.click(screen.getByRole('option', { name: /Route #1/ }));

    await userEvent.click(vehicleTrigger);
    await waitFor(() => screen.getByRole('option', { name: /51B-123\.45/ }));
    await userEvent.click(screen.getByRole('option', { name: /51B-123\.45/ }));

    const [deptInput, arrInput] = screen.getAllByDisplayValue('') as [HTMLElement, HTMLElement];
    await userEvent.type(deptInput, '2025-06-01T08:00');
    await userEvent.type(arrInput, '2025-06-01T16:00');

    // Update basePrice
    const priceInput = screen.getByLabelText(/base price/i);
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '200000');

    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ basePrice: 200000 }),
        }),
      );
    });
  });
});
