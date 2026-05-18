import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useListRoutes: vi.fn(),
  useListStations: vi.fn(),
  useCreateRoute: vi.fn(),
  useUpdateRoute: vi.fn(),
  useDeleteRoute: vi.fn(),
}));

import {
  useListRoutes,
  useListStations,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
} from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { RoutesPage } from './routes-page';

const sampleStations = [
  { id: 1, name: 'Station A', city: 'HCM', address: 'Addr A', lat: 10, lng: 106 },
  { id: 2, name: 'Station B', city: 'HN', address: 'Addr B', lat: 21, lng: 105 },
];

const sampleRoute = {
  id: 1,
  companyId: 3,
  fromStationId: 1,
  toStationId: 2,
  distanceKm: 350,
  durationMinutes: 480,
};

function setupMocks(routes = [] as unknown[], stations = [] as unknown[]) {
  vi.mocked(useListRoutes).mockReturnValue({
    data: routes,
    isLoading: false,
  } as unknown as ReturnType<typeof useListRoutes>);
  vi.mocked(useListStations).mockReturnValue({ data: stations } as unknown as ReturnType<
    typeof useListStations
  >);
  vi.mocked(useCreateRoute).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateRoute>);
  vi.mocked(useUpdateRoute).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateRoute>);
  vi.mocked(useDeleteRoute).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteRoute>);
}

describe('RoutesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('heading', { name: /routes/i })).toBeInTheDocument();
  });

  it('renders Add Route button', () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /add route/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useListRoutes).mockReturnValue({ data: [], isLoading: true } as unknown as ReturnType<
      typeof useListRoutes
    >);
    vi.mocked(useListStations).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListStations
    >);
    vi.mocked(useCreateRoute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateRoute>);
    vi.mocked(useUpdateRoute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateRoute>);
    vi.mocked(useDeleteRoute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteRoute>);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no routes', () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/no routes found/i)).toBeInTheDocument();
  });

  it('renders route row with resolved station names', () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByText('Station A')).toBeInTheDocument();
    expect(screen.getByText('Station B')).toBeInTheDocument();
  });

  it('renders fallback station label when station not in map', () => {
    setupMocks([sampleRoute], []);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByText('Station #1')).toBeInTheDocument();
    expect(screen.getByText('Station #2')).toBeInTheDocument();
  });

  it('renders distance and formatted duration', () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/350 km/)).toBeInTheDocument();
    expect(screen.getByText(/8h 0m/)).toBeInTheDocument();
  });

  it('opens create dialog when Add Route is clicked', async () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add route/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('create form shows validation error when distance is zero', async () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add route/i }));
    await userEvent.click(screen.getByRole('button', { name: /create route/i }));
    await waitFor(() => {
      const errors = screen.queryAllByText(/required|must be positive/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('opens edit dialog when Edit clicked', async () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText('Edit Route')).toBeInTheDocument();
    });
  });

  it('opens delete dialog when Delete clicked', async () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('passes companyId=undefined for admin user', () => {
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    expect(vi.mocked(useListRoutes)).toHaveBeenCalledWith({ companyId: undefined });
  });

  it('passes companyId from operator user', () => {
    setupMocks();
    renderWithProviders(<RoutesPage />, { auth: makeOperatorAuth(7) });
    expect(vi.mocked(useListRoutes)).toHaveBeenCalledWith({ companyId: 7 });
  });

  it('closes edit dialog and resets editRoute state', async () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => screen.getByText('Edit Route'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // After closing edit, Add Route opens a fresh create form (no pre-filled data)
    await userEvent.click(screen.getByRole('button', { name: /add route/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Create mode shows 'Create route' button, not 'Save changes'
      expect(screen.getByRole('button', { name: /create route/i })).toBeInTheDocument();
    });
  });

  it('closes delete dialog and resets deleteRoute state', async () => {
    setupMocks([sampleRoute], sampleStations);
    renderWithProviders(<RoutesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => screen.getByRole('alertdialog'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
