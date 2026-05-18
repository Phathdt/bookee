export interface Ticket {
  id: number;
  bookingSeatId: number;
  qrCode: string;
  status: string;
  checkInAt: Date | null;
  createdAt: Date;
}
