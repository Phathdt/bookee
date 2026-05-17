import { SeatLayout, SeatLayoutWithSeats } from '../entities/seat-layout.entity';

import { CreateSeatLayoutInput, UpdateSeatLayoutInput } from './seat-layouts.repository';

export abstract class ISeatLayoutsService {
  abstract list(): Promise<SeatLayout[]>;
  abstract getById(id: number): Promise<SeatLayoutWithSeats>;
  abstract create(input: CreateSeatLayoutInput): Promise<SeatLayoutWithSeats>;
  abstract update(id: number, input: UpdateSeatLayoutInput): Promise<SeatLayout>;
  abstract delete(id: number): Promise<void>;
}
