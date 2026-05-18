import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useCreateStation: vi.fn(),
  useUpdateStation: vi.fn(),
}));

import { toast } from 'sonner';
import { useCreateStation, useUpdateStation } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { StationFormDialog } from './station-form-dialog';

const mockToast = vi.mocked(toast);
const mockUseCreateStation = vi.mocked(useCreateStation);
const mockUseUpdateStation = vi.mocked(useUpdateStation);

const sampleStation = {
  id: 1,
  name: 'Ben Xe Mien Dong',
  address: '292 Dinh Bo Linh',
  city: 'Ho Chi Minh',
  lat: 10.8142,
  lng: 106.719,
};

function setupMocks(createImpl = vi.fn(), updateImpl = vi.fn()) {
  mockUseCreateStation.mockReturnValue({
    mutateAsync: createImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateStation>);
  mockUseUpdateStation.mockReturnValue({
    mutateAsync: updateImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateStation>);
}

describe('StationFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Add Station title when no station prop', () => {
    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Add Station')).toBeInTheDocument();
  });

  it('renders Edit Station title when station prop is provided', () => {
    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} station={sampleStation} />);
    expect(screen.getByText('Edit Station')).toBeInTheDocument();
  });

  it('pre-fills form fields in edit mode', () => {
    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} station={sampleStation} />);
    expect(screen.getByDisplayValue('Ben Xe Mien Dong')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ho Chi Minh')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/^Name$/i));
    await userEvent.click(screen.getByRole('button', { name: /create station/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('calls createMutation on valid add submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    setupMocks(mutateAsync);

    renderWithProviders(<StationFormDialog open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'New Station');
    await userEvent.type(screen.getByLabelText(/Address/i), '123 Main St');
    await userEvent.type(screen.getByLabelText(/City/i), 'Hanoi');
    await userEvent.click(screen.getByRole('button', { name: /create station/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Station created');
    });
  });

  it('calls updateMutation on valid edit submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const onOpenChange = vi.fn();
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(
      <StationFormDialog open onOpenChange={onOpenChange} station={sampleStation} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Station updated');
    });
  });

  it('shows error toast on create failure', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: 'Duplicate name' } } });
    setupMocks(mutateAsync);

    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'Station X');
    await userEvent.type(screen.getByLabelText(/Address/i), 'Addr');
    await userEvent.type(screen.getByLabelText(/City/i), 'City');
    await userEvent.click(screen.getByRole('button', { name: /create station/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Duplicate name');
    });
  });

  it('shows isPending on submit button', () => {
    mockUseCreateStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateStation>);
    mockUseUpdateStation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateStation>);

    renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<StationFormDialog open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets form when closed and reopened', async () => {
    const { rerender } = renderWithProviders(<StationFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'Typed name');

    rerender(<StationFormDialog open={false} onOpenChange={vi.fn()} />);
    rerender(<StationFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByDisplayValue('Typed name')).not.toBeInTheDocument();
  });
});
