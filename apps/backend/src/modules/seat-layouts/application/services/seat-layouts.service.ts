import { SeatLayout, SeatLayoutWithSeats } from '../../domain/entities/seat-layout.entity';
import {
  SeatLayoutInUseError,
  SeatLayoutNotFoundError,
  SeatLayoutValidationError,
} from '../../domain/errors';
import {
  CreateSeatLayoutInput,
  ISeatLayoutsRepository,
  UpdateSeatLayoutInput,
} from '../../domain/interfaces/seat-layouts.repository';
import { ISeatLayoutsService } from '../../domain/interfaces/seat-layouts.service';

export class SeatLayoutsService implements ISeatLayoutsService {
  constructor(private readonly seatLayouts: ISeatLayoutsRepository) {}

  private assertGridDimensions(rows: number, cols: number): void {
    if (rows <= 0) throw new SeatLayoutValidationError('rows must be > 0');
    if (cols <= 0) throw new SeatLayoutValidationError('cols must be > 0');
  }

  private assertSeatCodesUnique(seats: CreateSeatLayoutInput['seats']): void {
    const codes = seats.map((s) => s.code);
    const unique = new Set(codes);
    if (unique.size !== codes.length) {
      throw new SeatLayoutValidationError('Seat codes must be unique within a layout');
    }
  }

  private assertSeatPositionsUnique(seats: CreateSeatLayoutInput['seats']): void {
    const keys = seats.map((s) => `${s.floor}:${s.row}:${s.col}`);
    const unique = new Set(keys);
    if (unique.size !== keys.length) {
      throw new SeatLayoutValidationError(
        'Seat (floor, row, col) combinations must be unique within a layout',
      );
    }
  }

  private assertSeatsInBounds(
    seats: CreateSeatLayoutInput['seats'],
    rows: number,
    cols: number,
  ): void {
    for (const seat of seats) {
      if (seat.row < 1 || seat.row > rows) {
        throw new SeatLayoutValidationError(
          `Seat "${seat.code}" row ${seat.row} is out of bounds (1–${rows})`,
        );
      }
      if (seat.col < 1 || seat.col > cols) {
        throw new SeatLayoutValidationError(
          `Seat "${seat.code}" col ${seat.col} is out of bounds (1–${cols})`,
        );
      }
      if (seat.floor < 1) {
        throw new SeatLayoutValidationError(`Seat "${seat.code}" floor must be >= 1`);
      }
    }
  }

  list(): Promise<SeatLayout[]> {
    return this.seatLayouts.list();
  }

  async getById(id: number): Promise<SeatLayoutWithSeats> {
    const found = await this.seatLayouts.findById(id);
    if (!found) throw new SeatLayoutNotFoundError();
    return found;
  }

  async create(input: CreateSeatLayoutInput): Promise<SeatLayoutWithSeats> {
    this.assertGridDimensions(input.rows, input.cols);
    this.assertSeatCodesUnique(input.seats);
    this.assertSeatPositionsUnique(input.seats);
    this.assertSeatsInBounds(input.seats, input.rows, input.cols);
    return this.seatLayouts.create(input);
  }

  async update(id: number, input: UpdateSeatLayoutInput): Promise<SeatLayout> {
    const existing = await this.seatLayouts.findById(id);
    if (!existing) throw new SeatLayoutNotFoundError();
    if (input.rows !== undefined && input.rows <= 0) {
      throw new SeatLayoutValidationError('rows must be > 0');
    }
    if (input.cols !== undefined && input.cols <= 0) {
      throw new SeatLayoutValidationError('cols must be > 0');
    }
    return this.seatLayouts.update(id, input);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.seatLayouts.findById(id);
    if (!existing) throw new SeatLayoutNotFoundError();
    if (await this.seatLayouts.isReferencedByVehicle(id)) {
      throw new SeatLayoutInUseError();
    }
    await this.seatLayouts.delete(id);
  }
}
