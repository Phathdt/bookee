import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useListTrips: vi.fn(),
  useListRoutes: vi.fn(),
  useListVehicles: vi.fn(),
  useCreateTrip: vi.fn(),
  useBulkCreateTrips: vi.fn(),
  useSetTripStatus: vi.fn(),
}));

import {
  useListTrips,
  useListRoutes,
  useListVehicles,
  useCreateTrip,
  useBulkCreateTrips,
  useSetTripStatus,
} from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { TripsPage } from './trips-page';

const sampleTrip = {
  id: 1,
  routeId: 2,
  vehicleId: 3,
  departureTime: '2025-06-01T08:00:00Z',
  arrivalTime: '2025-06-01T16:00:00Z',
  basePrice: 150000,
  status: 'scheduled' as const,
};

function setupMocks(trips = [] as unknown[]) {
  vi.mocked(useListTrips).mockReturnValue({
    data: trips,
    isLoading: false,
  } as unknown as ReturnType<typeof useListTrips>);
  vi.mocked(useListRoutes).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useListRoutes
  >);
  vi.mocked(useListVehicles).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useListVehicles
  >);
  vi.mocked(useCreateTrip).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateTrip>);
  vi.mocked(useBulkCreateTrips).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useBulkCreateTrips>);
  vi.mocked(useSetTripStatus).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useSetTripStatus>);
}

describe('TripsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('heading', { name: /trips/i })).toBeInTheDocument();
  });

  it('renders Add Trip and Bulk Create buttons', () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /add trip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk create/i })).toBeInTheDocument();
  });

  it('shows empty state when no trips', () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useListTrips).mockReturnValue({ data: [], isLoading: true } as unknown as ReturnType<
      typeof useListTrips
    >);
    vi.mocked(useListRoutes).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListRoutes
    >);
    vi.mocked(useListVehicles).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListVehicles
    >);
    vi.mocked(useCreateTrip).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTrip>);
    vi.mocked(useBulkCreateTrips).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useBulkCreateTrips>);
    vi.mocked(useSetTripStatus).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSetTripStatus>);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders trip row with status badge', () => {
    setupMocks([sampleTrip]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
  });

  it('renders trip price formatted', () => {
    setupMocks([sampleTrip]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    // 150000 formatted as vi-VN currency
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('opens create dialog when Add Trip is clicked', async () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add trip/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens bulk create dialog when Bulk Create is clicked', async () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /bulk create/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/bulk create trips/i)).toBeInTheDocument();
    });
  });

  it('opens trip details dialog when View is clicked', async () => {
    setupMocks([sampleTrip]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /view/i }));
    await waitFor(() => {
      expect(screen.getByText('Trip Details')).toBeInTheDocument();
    });
  });

  it('create trip form shows validation error when submitting without route', async () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add trip/i }));
    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));
    await waitFor(() => {
      const errors = screen.queryAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('passes companyId from operator user to useListTrips', () => {
    setupMocks();
    renderWithProviders(<TripsPage />, { auth: makeOperatorAuth(7) });
    expect(vi.mocked(useListTrips)).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7 }));
  });

  it('passes companyId=undefined for admin user', () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(vi.mocked(useListTrips)).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: undefined }),
    );
  });

  it('renders TripStatusActions for scheduled trip (Start/Cancel buttons)', () => {
    setupMocks([sampleTrip]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders in_progress trip with status badge', () => {
    setupMocks([{ ...sampleTrip, status: 'in_progress' }]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('renders completed trip row', () => {
    setupMocks([{ ...sampleTrip, status: 'completed' }]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders cancelled trip row', () => {
    setupMocks([{ ...sampleTrip, status: 'cancelled' }]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    expect(screen.getByText('cancelled')).toBeInTheDocument();
  });

  it('closes trip view dialog and resets viewTrip state', async () => {
    setupMocks([sampleTrip]);
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /view/i }));
    await waitFor(() => screen.getByText('Trip Details'));
    // Close the dialog with the Close button
    const closeBtns = screen.getAllByRole('button', { name: /close/i });
    await userEvent.click(closeBtns[0]!);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // After closing view, clicking Add Trip opens create mode
    await userEvent.click(screen.getByRole('button', { name: /add trip/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Create mode shows 'Create trip' submit button
      expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument();
    });
  });

  it('changes status filter when select option is chosen', async () => {
    renderWithProviders(<TripsPage />, { auth: makeAuthValue() });
    // The status filter combobox
    const filterSelect = screen.getByRole('combobox');
    await userEvent.click(filterSelect);
    await waitFor(() => screen.getByRole('option', { name: /scheduled/i }));
    await userEvent.click(screen.getByRole('option', { name: /scheduled/i }));
    // useListTrips should be called with status: 'scheduled'
    await waitFor(() => {
      expect(vi.mocked(useListTrips)).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled' }),
      );
    });
  });
});
