import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useCreateRoute: vi.fn(),
  useUpdateRoute: vi.fn(),
  useListStations: vi.fn(),
}));

import { toast } from 'sonner';
import { useCreateRoute, useUpdateRoute, useListStations } from '@bookee/api-client';
import { renderWithProviders, makeAuthValue, makeOperatorAuth } from '@/test/test-utils';
import { RouteFormDialog } from './route-form-dialog';

const mockToast = vi.mocked(toast);

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

function setupMocks(createImpl = vi.fn(), updateImpl = vi.fn()) {
  vi.mocked(useCreateRoute).mockReturnValue({
    mutateAsync: createImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateRoute>);
  vi.mocked(useUpdateRoute).mockReturnValue({
    mutateAsync: updateImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateRoute>);
  vi.mocked(useListStations).mockReturnValue({ data: sampleStations } as unknown as ReturnType<
    typeof useListStations
  >);
}

describe('RouteFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Add Route title in create mode', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByText('Add Route')).toBeInTheDocument();
  });

  it('renders Edit Route title in edit mode', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} route={sampleRoute} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByText('Edit Route')).toBeInTheDocument();
  });

  it('pre-fills distanceKm and durationMinutes in edit mode', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} route={sampleRoute} />, {
      auth: makeAuthValue(),
    });
    expect(screen.getByDisplayValue('350')).toBeInTheDocument();
    expect(screen.getByDisplayValue('480')).toBeInTheDocument();
  });

  it('hides station selects in edit mode', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} route={sampleRoute} />, {
      auth: makeAuthValue(),
    });
    expect(screen.queryByText('From Station')).not.toBeInTheDocument();
    expect(screen.queryByText('To Station')).not.toBeInTheDocument();
  });

  it('shows station selects in create mode', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByText('From Station')).toBeInTheDocument();
    expect(screen.getByText('To Station')).toBeInTheDocument();
  });

  it('shows Company ID field disabled when operator has operatorId', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(5),
    });
    expect(screen.getByLabelText(/company id/i)).toBeDisabled();
  });

  it('shows Company ID field enabled when admin (operatorId null)', () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    const companyInput = screen.getByLabelText(/company id/i);
    expect(companyInput).not.toBeDisabled();
  });

  it('shows validation error when distanceKm is zero on create', async () => {
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    await userEvent.click(screen.getByRole('button', { name: /create route/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/required|positive/i).length).toBeGreaterThan(0);
    });
  });

  it('calls createMutation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, {
      auth: makeOperatorAuth(3),
    });

    // Fill distance and duration (company auto-filled for operator)
    const distanceInput = screen.getByLabelText(/distance.*km/i);
    await userEvent.clear(distanceInput);
    await userEvent.type(distanceInput, '350');

    const durationInput = screen.getByLabelText(/duration.*min/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '480');

    // Select from station
    const fromTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(fromTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Station A/ }));
    await userEvent.click(screen.getByRole('option', { name: /Station A/ }));

    // Select to station
    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /Station B/ }));
    await userEvent.click(screen.getByRole('option', { name: /Station B/ }));

    await userEvent.click(screen.getByRole('button', { name: /create route/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Route created');
    });
  });

  it('calls updateMutation on edit submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} route={sampleRoute} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Route updated');
    });
  });

  it('shows error toast on failure', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: 'Server error' } } });
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} route={sampleRoute} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows Saving… when isPending', () => {
    vi.mocked(useCreateRoute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateRoute>);
    vi.mocked(useUpdateRoute).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateRoute>);
    vi.mocked(useListStations).mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof useListStations
    >);
    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<RouteFormDialog open onOpenChange={onOpenChange} />, {
      auth: makeAuthValue(),
    });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates companyId via number input onChange', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<RouteFormDialog open onOpenChange={vi.fn()} />, { auth: makeAuthValue() });

    // Admin can edit Company ID
    const companyInput = screen.getByLabelText(/company id/i);
    await userEvent.clear(companyInput);
    await userEvent.type(companyInput, '5');

    // Fill distance and duration
    const distanceInput = screen.getByLabelText(/distance.*km/i);
    await userEvent.clear(distanceInput);
    await userEvent.type(distanceInput, '200');

    const durationInput = screen.getByLabelText(/duration.*min/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '240');

    // Select from station
    const fromTrigger = screen.getAllByRole('combobox')[0]!;
    await userEvent.click(fromTrigger);
    await waitFor(() => screen.getByRole('option', { name: /Station A/ }));
    await userEvent.click(screen.getByRole('option', { name: /Station A/ }));

    // Select to station
    const triggers = screen.getAllByRole('combobox');
    await userEvent.click(triggers[1]!);
    await waitFor(() => screen.getByRole('option', { name: /Station B/ }));
    await userEvent.click(screen.getByRole('option', { name: /Station B/ }));

    await userEvent.click(screen.getByRole('button', { name: /create route/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 5 }),
        }),
      );
    });
  });
});
