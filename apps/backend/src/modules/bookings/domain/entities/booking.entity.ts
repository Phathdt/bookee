import { BookingStatus } from '../enums';

export interface Booking {
  id: number;
  bookingCode: string;
  userId: number | null;
  tripId: number;
  totalAmount: number;
  status: BookingStatus;
  couponId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingSeat {
  id: number;
  bookingId: number;
  seatId: number;
  price: number;
}

export interface Passenger {
  id: number;
  bookingId: number;
  fullName: string;
  phone: string;
  idCardEncrypted: string;
}

export interface BookingWithDetails extends Booking {
  seats: BookingSeat[];
  passengers: Passenger[];
}
