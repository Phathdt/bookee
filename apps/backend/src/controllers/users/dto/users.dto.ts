import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^[+\d\s-]+$/, 'Invalid phone format');
const emailSchema = z.string().email().max(254);

export const updateProfileBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined || v.email !== undefined, {
    message: 'At least one field must be provided',
  });
export class UpdateProfileBodyDto extends createZodDto(updateProfileBodySchema) {}

export const publicUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'operator', 'driver', 'admin']),
  operatorId: z.number().int().nullable(),
  // Serialized as ISO-8601 strings in HTTP payloads.
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class PublicUserDto extends createZodDto(publicUserSchema) {}
