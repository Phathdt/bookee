import { SeatLayout, SeatLayoutWithSeats } from '../entities/seat-layout.entity';

export interface SeatInput {
  code: string;
  floor: number;
  row: number;
  col: number;
}

export interface CreateSeatLayoutInput {
  name: string;
  rows: number;
  cols: number;
  seats: SeatInput[];
}

export interface UpdateSeatLayoutInput {
  name?: string;
  rows?: number;
  cols?: number;
}

export abstract class ISeatLayoutsRepository {
  abstract findById(id: number): Promise<SeatLayoutWithSeats | null>;
  abstract list(): Promise<SeatLayout[]>;
  /** Creates layout and seats atomically in a single transaction. */
  abstract create(input: CreateSeatLayoutInput): Promise<SeatLayoutWithSeats>;
  abstract update(id: number, input: UpdateSeatLayoutInput): Promise<SeatLayout>;
  abstract delete(id: number): Promise<void>;
  /** True if any Vehicle still references this layout. */
  abstract isReferencedByVehicle(id: number): Promise<boolean>;
}
