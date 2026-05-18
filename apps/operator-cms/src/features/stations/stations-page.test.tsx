import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useListStations: vi.fn(),
  useCreateStation: vi.fn(),
  useUpdateStation: vi.fn(),
  useDeleteStation: vi.fn(),
}));

import {
  useListStations,
  useCreateStation,
  useUpdateStation,
  useDeleteStation,
} from '@bookee/api-client';
import { renderWithProviders, makeAuthValue } from '@/test/test-utils';
import { StationsPage } from './stations-page';

const sampleStation = {
  id: 1,
  name: 'Mien Tay',
  city: 'HCM',
  address: '395 Kinh Duong Vuong',
  lat: 10.7365,
  lng: 106.6278,
};

function setupMocks(stations = [] as unknown[]) {
  vi.mocked(useListStations).mockReturnValue({
    data: stations,
    isLoading: false,
  } as unknown as ReturnType<typeof useListStations>);
  vi.mocked(useCreateStation).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateStation>);
  vi.mocked(useUpdateStation).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateStation>);
  vi.mocked(useDeleteStation).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteStation>);
}

describe('StationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('heading', { name: /stations/i })).toBeInTheDocument();
  });

  it('renders Add Station button', () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /add station/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useListStations).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useListStations>);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no stations', () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/no stations found/i)).toBeInTheDocument();
  });

  it('renders station row in table', () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByText('Mien Tay')).toBeInTheDocument();
    expect(screen.getByText('HCM')).toBeInTheDocument();
    expect(screen.getByText('395 Kinh Duong Vuong')).toBeInTheDocument();
  });

  it('renders lat/lng formatted to 4 decimal places', () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/10\.7365.*106\.6278/)).toBeInTheDocument();
  });

  it('opens create dialog when Add Station is clicked', async () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Create mode has 'Create station' submit button
      expect(screen.getByRole('button', { name: /create station/i })).toBeInTheDocument();
    });
  });

  it('closes create dialog when Cancel is clicked', async () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));
    await waitFor(() => screen.getByRole('dialog'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens edit dialog when Edit is clicked', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText('Edit Station')).toBeInTheDocument();
    });
  });

  it('pre-fills station data in edit dialog', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Mien Tay')).toBeInTheDocument();
    });
  });

  it('closes edit dialog and resets on close', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => screen.getByText('Edit Station'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // After closing edit, Add Station opens a fresh create form
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Create mode shows 'Create station' button, not 'Save changes'
      expect(screen.getByRole('button', { name: /create station/i })).toBeInTheDocument();
    });
  });

  it('opens delete dialog when Delete is clicked', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('closes delete dialog on cancel', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => screen.getByRole('alertdialog'));
    // Click cancel button in alert dialog
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('filters stations via search input', async () => {
    setupMocks([sampleStation]);
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    const searchInput = screen.getByPlaceholderText(/search stations/i);
    await userEvent.type(searchInput, 'Mien');
    // The search is passed to useListStations — verify query was called with q param
    expect(vi.mocked(useListStations)).toHaveBeenCalledWith(expect.objectContaining({ q: 'Mien' }));
  });

  it('passes undefined q when search is empty', () => {
    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    expect(vi.mocked(useListStations)).toHaveBeenCalledWith({ q: undefined });
  });

  it('calls createStation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useCreateStation).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateStation>);

    renderWithProviders(<StationsPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add station/i }));
    await waitFor(() => screen.getByRole('dialog'));

    await userEvent.type(screen.getByLabelText(/^name$/i), 'Ben Xe Mien Tay');
    await userEvent.type(screen.getByLabelText(/city/i), 'HCM');
    await userEvent.type(screen.getByLabelText(/address/i), '395 Kinh Duong Vuong');
    await userEvent.type(screen.getByLabelText(/latitude/i), '10.7365');
    await userEvent.type(screen.getByLabelText(/longitude/i), '106.6278');

    await userEvent.click(screen.getByRole('button', { name: /create station/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
  });
});
