import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@bookee/api-client', () => ({
  useListSeatLayouts: vi.fn(),
  useCreateSeatLayout: vi.fn(),
  useUpdateSeatLayout: vi.fn(),
  useDeleteSeatLayout: vi.fn(),
}));

import {
  useListSeatLayouts,
  useCreateSeatLayout,
  useUpdateSeatLayout,
  useDeleteSeatLayout,
} from '@bookee/api-client';
import { renderWithProviders } from '@/test/test-utils';
import { SeatLayoutsPage } from './seat-layouts-page';

const mockUseListSeatLayouts = vi.mocked(useListSeatLayouts);

function setupMocks(layouts = [] as unknown[]) {
  mockUseListSeatLayouts.mockReturnValue({
    data: layouts,
    isLoading: false,
  } as unknown as ReturnType<typeof useListSeatLayouts>);
  vi.mocked(useCreateSeatLayout).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateSeatLayout>);
  vi.mocked(useUpdateSeatLayout).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateSeatLayout>);
  vi.mocked(useDeleteSeatLayout).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteSeatLayout>);
}

const sampleLayout = {
  id: 1,
  name: 'Sleeper 40',
  rows: 10,
  cols: 4,
  seats: [{ code: 'A1', row: 1, col: 1 }],
};

describe('SeatLayoutsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders heading', () => {
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByRole('heading', { name: /seat layouts/i })).toBeInTheDocument();
  });

  it('renders Add Layout button', () => {
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByRole('button', { name: /add layout/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseListSeatLayouts.mockReturnValue({ data: [], isLoading: true } as unknown as ReturnType<
      typeof useListSeatLayouts
    >);
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no layouts', () => {
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByText(/no seat layouts found/i)).toBeInTheDocument();
  });

  it('renders layout rows in table', () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByText('Sleeper 40')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows seats count', () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows — for missing seats', () => {
    setupMocks([{ ...sampleLayout, seats: undefined }]);
    renderWithProviders(<SeatLayoutsPage />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('opens add dialog when Add Layout clicked', async () => {
    renderWithProviders(<SeatLayoutsPage />);
    await userEvent.click(screen.getByRole('button', { name: /add layout/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Seat Layout')).toBeInTheDocument();
    });
  });

  it('opens edit dialog when Edit clicked', async () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText('Edit Seat Layout')).toBeInTheDocument();
    });
  });

  it('opens delete dialog when Delete clicked', async () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('closes edit dialog and resets editLayout state', async () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => screen.getByText('Edit Seat Layout'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    // After closing edit, Add Layout should open Add dialog (not Edit)
    await userEvent.click(screen.getByRole('button', { name: /add layout/i }));
    await waitFor(() => {
      expect(screen.getByText('Add Seat Layout')).toBeInTheDocument();
    });
  });

  it('closes delete dialog and resets deleteLayout state', async () => {
    setupMocks([sampleLayout]);
    renderWithProviders(<SeatLayoutsPage />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => screen.getByRole('alertdialog'));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
