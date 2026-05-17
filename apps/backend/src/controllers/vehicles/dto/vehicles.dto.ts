import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const vehicleDtoSchema = z.object({
  id: z.number().int(),
  companyId: z.number().int(),
  plateNumber: z.string(),
  type: z.string(),
  seatLayoutId: z.number().int(),
  totalSeats: z.number().int(),
});
export class VehicleDto extends createZodDto(vehicleDtoSchema) {}

export const createVehicleBodySchema = z.object({
  companyId: z.number().int().positive(),
  plateNumber: z.string().min(1).max(20),
  type: z.string().min(1).max(50),
  seatLayoutId: z.number().int().positive(),
  totalSeats: z.number().int().positive(),
});
export class CreateVehicleBodyDto extends createZodDto(createVehicleBodySchema) {}

/**
 * companyId is intentionally excluded — it is immutable after creation.
 */
export const updateVehicleBodySchema = z
  .object({
    plateNumber: z.string().min(1).max(20).optional(),
    type: z.string().min(1).max(50).optional(),
    seatLayoutId: z.number().int().positive().optional(),
    totalSeats: z.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });
export class UpdateVehicleBodyDto extends createZodDto(updateVehicleBodySchema) {}

export const vehicleSearchQuerySchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  type: z.string().min(1).max(50).optional(),
});
export class VehicleSearchQueryDto extends createZodDto(vehicleSearchQuerySchema) {}
