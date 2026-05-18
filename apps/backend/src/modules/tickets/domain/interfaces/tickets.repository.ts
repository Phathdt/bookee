import { Ticket } from '../entities/ticket.entity';

export interface CreateTicketInput {
  bookingSeatId: number;
  qrCode: string;
}

export abstract class ITicketsRepository {
  abstract createMany(inputs: CreateTicketInput[]): Promise<Ticket[]>;
  abstract findByBookingId(bookingId: number): Promise<Ticket[]>;
  abstract setStatus(id: number, status: string): Promise<void>;
}
