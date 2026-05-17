import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BOOKING_STATUSES } from '@/modules/bookings/domain/enums';

// ---- Request DTOs -----------------------------------------------------------

const PassengerInputSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  idCard: z.string().min(1),
});

export class CreateBookingBodyDto extends createZodDto(
  z.object({
    tripId: z.number().int().positive(),
    seatIds: z.array(z.number().int().positive()).min(1),
    passengers: z.array(PassengerInputSchema).min(1),
    couponCode: z.string().optional(),
  }),
) {}

export class LookupBookingQueryDto extends createZodDto(
  z.object({
    code: z.string().min(1),
    phone: z.string().min(1),
  }),
) {}

// ---- Response DTOs ----------------------------------------------------------

const PassengerOutputSchema = z.object({
  id: z.number(),
  bookingId: z.number(),
  fullName: z.string(),
  phone: z.string(),
  /** Masked: ***XXXX */
  idCardMasked: z.string(),
});

export class PassengerDto extends createZodDto(PassengerOutputSchema) {}

const BookingSeatOutputSchema = z.object({
  id: z.number(),
  bookingId: z.number(),
  seatId: z.number(),
  price: z.number(),
});

export class BookingSeatDto extends createZodDto(BookingSeatOutputSchema) {}

const BookingOutputSchema = z.object({
  id: z.number(),
  bookingCode: z.string(),
  userId: z.number().nullable(),
  tripId: z.number(),
  totalAmount: z.number(),
  status: z.enum(BOOKING_STATUSES),
  couponId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class BookingDto extends createZodDto(BookingOutputSchema) {}

const BookingWithDetailsOutputSchema = BookingOutputSchema.extend({
  seats: z.array(BookingSeatOutputSchema),
  passengers: z.array(PassengerOutputSchema),
});

export class BookingWithDetailsDto extends createZodDto(BookingWithDetailsOutputSchema) {}
