import { SeatLayout, SeatLayoutWithSeats, Seat } from '../../domain/entities/seat-layout.entity';
import {
  ISeatLayoutsRepository,
  CreateSeatLayoutInput,
  UpdateSeatLayoutInput,
} from '../../domain/interfaces/seat-layouts.repository';

import { SeatModel } from '@/generated/prisma/models/Seat';
import { SeatLayoutModel } from '@/generated/prisma/models/SeatLayout';
import { DatabaseService } from '@/modules/database/database.service';

export class SeatLayoutsRepositoryPrisma extends ISeatLayoutsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toSeatEntity(row: SeatModel): Seat {
    return {
      id: row.id,
      layoutId: row.layoutId,
      code: row.code,
      floor: row.floor,
      row: row.row,
      col: row.col,
    };
  }

  private toLayoutEntity(row: SeatLayoutModel): SeatLayout {
    return {
      id: row.id,
      name: row.name,
      rows: row.rows,
      cols: row.cols,
    };
  }

  private toLayoutWithSeats(row: SeatLayoutModel & { seats: SeatModel[] }): SeatLayoutWithSeats {
    return {
      ...this.toLayoutEntity(row),
      seats: row.seats.map((s) => this.toSeatEntity(s)),
    };
  }

  async findById(id: number): Promise<SeatLayoutWithSeats | null> {
    const row = await this.db.seatLayout.findUnique({ where: { id } });
    if (!row) return null;
    const seatRows = await this.db.seat.findMany({
      where: { layoutId: id },
      orderBy: [{ floor: 'asc' }, { row: 'asc' }, { col: 'asc' }],
    });
    return this.toLayoutWithSeats({ ...row, seats: seatRows });
  }

  async list(): Promise<SeatLayout[]> {
    const rows = await this.db.seatLayout.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => this.toLayoutEntity(r));
  }

  async create(input: CreateSeatLayoutInput): Promise<SeatLayoutWithSeats> {
    const result = await this.db.$transaction(async (tx) => {
      const layout = await tx.seatLayout.create({
        data: { name: input.name, rows: input.rows, cols: input.cols },
      });
      await tx.seat.createMany({
        data: input.seats.map((s) => ({
          layoutId: layout.id,
          code: s.code,
          floor: s.floor,
          row: s.row,
          col: s.col,
        })),
      });
      const seats = await tx.seat.findMany({
        where: { layoutId: layout.id },
        orderBy: [{ floor: 'asc' }, { row: 'asc' }, { col: 'asc' }],
      });
      return { ...layout, seats };
    });
    return this.toLayoutWithSeats(result);
  }

  async update(id: number, input: UpdateSeatLayoutInput): Promise<SeatLayout> {
    const row = await this.db.seatLayout.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.rows !== undefined && { rows: input.rows }),
        ...(input.cols !== undefined && { cols: input.cols }),
      },
    });
    return this.toLayoutEntity(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.seat.deleteMany({ where: { layoutId: id } });
      await tx.seatLayout.delete({ where: { id } });
    });
  }

  async isReferencedByVehicle(id: number): Promise<boolean> {
    const count = await this.db.vehicle.count({ where: { seatLayoutId: id } });
    return count > 0;
  }
}
