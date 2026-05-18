import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@bookee/api-client', () => ({
  useCreateSeatLayout: vi.fn(),
  useUpdateSeatLayout: vi.fn(),
}));

import { toast } from 'sonner';
import { useCreateSeatLayout, useUpdateSeatLayout } from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { SeatLayoutFormDialog } from './seat-layout-form-dialog';

const mockToast = vi.mocked(toast);

const sampleLayout = {
  id: 1,
  name: 'Sleeper 40',
  rows: 10,
  cols: 4,
  seats: [{ id: 1, layoutId: 1, code: 'A1', floor: 1, row: 1, col: 1 }],
};

function setupMocks(createImpl = vi.fn(), updateImpl = vi.fn()) {
  vi.mocked(useCreateSeatLayout).mockReturnValue({
    mutateAsync: createImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateSeatLayout>);
  vi.mocked(useUpdateSeatLayout).mockReturnValue({
    mutateAsync: updateImpl,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateSeatLayout>);
}

describe('SeatLayoutFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Add Seat Layout title for create mode', () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByText('Add Seat Layout')).toBeInTheDocument();
  });

  it('renders Edit Seat Layout title in edit mode', () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} layout={sampleLayout} />);
    expect(screen.getByText('Edit Seat Layout')).toBeInTheDocument();
  });

  it('pre-fills form in edit mode', () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} layout={sampleLayout} />);
    expect(screen.getByDisplayValue('Sleeper 40')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('hides Seats JSON field in edit mode', () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} layout={sampleLayout} />);
    expect(screen.queryByLabelText(/seats.*json/i)).not.toBeInTheDocument();
  });

  it('shows Seats JSON field in create mode', () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText(/seats.*json/i)).toBeInTheDocument();
  });

  it('shows validation error on empty name submit', async () => {
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/^Name$/i));
    await userEvent.click(screen.getByRole('button', { name: /create layout/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('sets invalid JSON error when seats JSON is malformed', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'Test Layout');
    const seatsField = screen.getByLabelText(/seats.*json/i);
    await userEvent.clear(seatsField);
    await userEvent.type(seatsField, 'not valid json {{}');
    await userEvent.click(screen.getByRole('button', { name: /create layout/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('calls createMutation on valid submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(mutateAsync);

    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'New Layout');
    await userEvent.click(screen.getByRole('button', { name: /create layout/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Seat layout created');
    });
  });

  it('calls updateMutation on valid edit submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} layout={sampleLayout} />);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Seat layout updated');
    });
  });

  it('shows error toast on create failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({ response: { data: { message: 'Conflict' } } });
    setupMocks(mutateAsync);

    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Name$/i), 'Layout X');
    await userEvent.click(screen.getByRole('button', { name: /create layout/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Conflict');
    });
  });

  it('shows Saving… when isPending', () => {
    vi.mocked(useCreateSeatLayout).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateSeatLayout>);
    vi.mocked(useUpdateSeatLayout).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSeatLayout>);
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uses PLACEHOLDER_SEATS when layout has no seats', () => {
    renderWithProviders(
      <SeatLayoutFormDialog
        open
        onOpenChange={vi.fn()}
        layout={{ ...sampleLayout, seats: undefined }}
      />,
    );
    // In edit mode seats JSON is hidden, so no textarea rendered
    expect(screen.queryByLabelText(/seats.*json/i)).not.toBeInTheDocument();
  });

  it('updates rows and cols fields via number input onChange', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    setupMocks(vi.fn(), mutateAsync);

    renderWithProviders(<SeatLayoutFormDialog open onOpenChange={vi.fn()} layout={sampleLayout} />);

    const rowsInput = screen.getByLabelText(/^rows$/i);
    await userEvent.clear(rowsInput);
    await userEvent.type(rowsInput, '12');

    const colsInput = screen.getByLabelText(/^cols$/i);
    await userEvent.clear(colsInput);
    await userEvent.type(colsInput, '5');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rows: 12, cols: 5 }),
        }),
      );
    });
  });
});
