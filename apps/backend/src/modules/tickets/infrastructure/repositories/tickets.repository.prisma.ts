import { DatabaseService } from '@/modules/database/database.service';

import { Ticket } from '../../domain/entities/ticket.entity';
import { CreateTicketInput, ITicketsRepository } from '../../domain/interfaces/tickets.repository';

export class TicketsRepositoryPrisma extends ITicketsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: {
    id: number;
    bookingSeatId: number;
    qrCode: string;
    status: string;
    checkInAt: Date | null;
    createdAt: Date;
  }): Ticket {
    return {
      id: row.id,
      bookingSeatId: row.bookingSeatId,
      qrCode: row.qrCode,
      status: row.status,
      checkInAt: row.checkInAt,
      createdAt: row.createdAt,
    };
  }

  async createMany(inputs: CreateTicketInput[]): Promise<Ticket[]> {
    if (inputs.length === 0) return [];
    await this.db.ticket.createMany({
      data: inputs.map((i) => ({
        bookingSeatId: i.bookingSeatId,
        qrCode: i.qrCode,
        status: 'valid',
      })),
    });
    const rows = await this.db.ticket.findMany({
      where: { bookingSeatId: { in: inputs.map((i) => i.bookingSeatId) } },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findByBookingId(bookingId: number): Promise<Ticket[]> {
    // BookingSeat.bookingId is the FK; we join via bookingSeat
    const seats = await this.db.bookingSeat.findMany({ where: { bookingId } });
    if (seats.length === 0) return [];
    const seatIds = seats.map((s) => s.id);
    const rows = await this.db.ticket.findMany({
      where: { bookingSeatId: { in: seatIds } },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async setStatus(id: number, status: string): Promise<void> {
    await this.db.ticket.update({ where: { id }, data: { status } });
  }
}
