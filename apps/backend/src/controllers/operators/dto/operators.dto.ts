import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ---- Schemas ------------------------------------------------------------

export const operatorStatusSchema = z.enum(['pending', 'active', 'suspended']);

export const operatorSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  hotline: z.string(),
  logo: z.string().nullable(),
  status: operatorStatusSchema,
});
export class OperatorDto extends createZodDto(operatorSchema) {}

export const createOperatorBodySchema = z.object({
  name: z.string().min(1).max(120),
  hotline: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[+\d\s-]+$/, 'Invalid hotline format'),
  logo: z.string().url().max(500).optional(),
});
export class CreateOperatorBodyDto extends createZodDto(createOperatorBodySchema) {}

export const updateOperatorBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    hotline: z.string().min(8).max(20).optional(),
    logo: z.string().url().max(500).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });
export class UpdateOperatorBodyDto extends createZodDto(updateOperatorBodySchema) {}

export const setOperatorStatusBodySchema = z.object({
  status: operatorStatusSchema,
});
export class SetOperatorStatusBodyDto extends createZodDto(setOperatorStatusBodySchema) {}

export const assignStaffBodySchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['operator', 'driver']),
});
export class AssignStaffBodyDto extends createZodDto(assignStaffBodySchema) {}

export const publicStaffUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'operator', 'driver', 'admin']),
  operatorId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class PublicStaffUserDto extends createZodDto(publicStaffUserSchema) {}
