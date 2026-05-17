import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const seatDtoSchema = z.object({
  id: z.number().int(),
  layoutId: z.number().int(),
  code: z.string(),
  floor: z.number().int(),
  row: z.number().int(),
  col: z.number().int(),
});
export class SeatDto extends createZodDto(seatDtoSchema) {}

export const seatLayoutDtoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  rows: z.number().int(),
  cols: z.number().int(),
  seats: z.array(seatDtoSchema).optional(),
});
export class SeatLayoutDto extends createZodDto(seatLayoutDtoSchema) {}

const createSeatInputSchema = z.object({
  code: z.string().min(1).max(20),
  floor: z.number().int().min(1).optional().default(1),
  row: z.number().int().min(1),
  col: z.number().int().min(1),
});

export const createSeatLayoutBodySchema = z.object({
  name: z.string().min(1).max(200),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  seats: z.array(createSeatInputSchema).min(1),
});
export class CreateSeatLayoutBodyDto extends createZodDto(createSeatLayoutBodySchema) {}

export const updateSeatLayoutBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    rows: z.number().int().positive().optional(),
    cols: z.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });
export class UpdateSeatLayoutBodyDto extends createZodDto(updateSeatLayoutBodySchema) {}
