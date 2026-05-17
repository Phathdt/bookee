import {
  Seat,
  SeatLayout,
  SeatLayoutWithSeats,
} from '@/modules/seat-layouts/domain/entities/seat-layout.entity';
import {
  CreateSeatLayoutInput,
  ISeatLayoutsRepository,
  UpdateSeatLayoutInput,
} from '@/modules/seat-layouts/domain/interfaces/seat-layouts.repository';

export function makeFakeSeatLayoutsRepository(
  options: {
    isReferencedByVehicle?: (id: number) => boolean;
  } = {},
): ISeatLayoutsRepository {
  const layouts = new Map<number, SeatLayout>();
  const seats = new Map<number, Seat[]>();
  let nextLayoutId = 1;
  let nextSeatId = 1;

  return {
    async findById(id: number): Promise<SeatLayoutWithSeats | null> {
      const layout = layouts.get(id);
      if (!layout) return null;
      return { ...layout, seats: seats.get(id) ?? [] };
    },

    async list(): Promise<SeatLayout[]> {
      return [...layouts.values()].sort((a, b) => a.id - b.id);
    },

    async create(input: CreateSeatLayoutInput): Promise<SeatLayoutWithSeats> {
      const layout: SeatLayout = {
        id: nextLayoutId++,
        name: input.name,
        rows: input.rows,
        cols: input.cols,
      };
      const layoutSeats: Seat[] = input.seats.map((s) => ({
        id: nextSeatId++,
        layoutId: layout.id,
        code: s.code,
        floor: s.floor,
        row: s.row,
        col: s.col,
      }));
      layouts.set(layout.id, layout);
      seats.set(layout.id, layoutSeats);
      return { ...layout, seats: layoutSeats };
    },

    async update(id: number, input: UpdateSeatLayoutInput): Promise<SeatLayout> {
      const existing = layouts.get(id);
      if (!existing) throw new Error('not found');
      const updated: SeatLayout = {
        ...existing,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.rows !== undefined && { rows: input.rows }),
        ...(input.cols !== undefined && { cols: input.cols }),
      };
      layouts.set(id, updated);
      return updated;
    },

    async delete(id: number): Promise<void> {
      layouts.delete(id);
      seats.delete(id);
    },

    async isReferencedByVehicle(id: number): Promise<boolean> {
      return options.isReferencedByVehicle?.(id) ?? false;
    },
  } satisfies ISeatLayoutsRepository;
}
