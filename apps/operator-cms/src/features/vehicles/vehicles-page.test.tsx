import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useListVehicles: vi.fn(),
  useCreateVehicle: vi.fn(),
  useUpdateVehicle: vi.fn(),
  useDeleteVehicle: vi.fn(),
  useListSeatLayouts: vi.fn(),
}));

import {
  useListVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useListSeatLayouts,
} from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { VehiclesPage } from './vehicles-page';

const sampleVehicle = {
  id: 1,
  companyId: 3,
  plateNumber: '51B-123.45',
  type: 'Sleeper',
  seatLayoutId: 1,
  totalSeats: 40,
};

function setupMocks(vehicles = [] as unknown[]) {
  vi.mocked(useListVehicles).mockReturnValue({
    data: vehicles,
    isLoading: false,
  } as unknown as ReturnType<typeof useListVehicles>);
  vi.mocked(useCreateVehicle).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateVehicle>);
  vi.mocked(useUpdateVehicle).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateVehicle>);
  vi.mocked(useDeleteVehicle).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteVehicle>);
  vi.mocked(useListSeatLayouts).mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useListSeatLayouts
  >);
}

describe('VehiclesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('heading', { name: /vehicles/i })).toBeInTheDocument();
  });

  it('renders Add Vehicle button', () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /add vehicle/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useListVehicles).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useListVehicles>);
    vi.mocked(useCreateVehicle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateVehicle>);
    vi.mocked(useUpdateVehicle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateVehicle>);
    vi.mocked(useDeleteVehicle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteVehicle>);
    vi.mocked(useListSeatLayouts).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListSeatLayouts
    >);
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no vehicles', () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(screen.getByText(/no vehicles found/i)).toBeInTheDocument();
  });

  it('renders vehicle row', () => {
    setupMocks([sampleVehicle]);
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(screen.getByText('51B-123.45')).toBeInTheDocument();
    expect(screen.getByText('Sleeper')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('opens create dialog when Add Vehicle is clicked', async () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('create form dialog can be opened and closed', async () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /add vehicle/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/plate number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens edit dialog when Edit clicked', async () => {
    setupMocks([sampleVehicle]);
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText('Edit Vehicle')).toBeInTheDocument();
    });
  });

  it('opens delete dialog when Delete clicked', async () => {
    setupMocks([sampleVehicle]);
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('passes companyId from operator user', () => {
    renderWithProviders(<VehiclesPage />, { auth: makeOperatorAuth(7) });
    expect(vi.mocked(useListVehicles)).toHaveBeenCalledWith({ companyId: 7 });
  });

  it('passes companyId=undefined for admin user', () => {
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    expect(vi.mocked(useListVehicles)).toHaveBeenCalledWith({ companyId: undefined });
  });

  it('closes delete dialog and resets deleteVehicle state', async () => {
    setupMocks([sampleVehicle]);
    renderWithProviders(<VehiclesPage />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => screen.getByRole('alertdialog'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
