import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PAYMENT_STATUSES } from '@/modules/payments/domain/enums';

// ---- Request DTOs -----------------------------------------------------------

export class CreatePaymentBodyDto extends createZodDto(
  z.object({
    bookingId: z.number().int().positive(),
    provider: z.enum(['momo', 'stripe']),
    returnUrl: z.string().url(),
  }),
) {}

export class PaymentManualConfirmBodyDto extends createZodDto(
  z.object({
    transactionId: z.string().min(1),
  }),
) {}

// ---- Response DTOs ----------------------------------------------------------

const PaymentOutputSchema = z.object({
  id: z.number(),
  bookingId: z.number(),
  provider: z.string(),
  amount: z.number(),
  status: z.enum(PAYMENT_STATUSES),
  transactionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class PaymentDto extends createZodDto(PaymentOutputSchema) {}

export class CreatePaymentResponseDto extends createZodDto(
  PaymentOutputSchema.extend({
    paymentUrl: z.string(),
  }),
) {}
