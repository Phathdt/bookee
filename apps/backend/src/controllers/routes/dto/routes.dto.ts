import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const routeSchema = z.object({
  id: z.number().int(),
  companyId: z.number().int(),
  fromStationId: z.number().int(),
  toStationId: z.number().int(),
  distanceKm: z.number(),
  durationMinutes: z.number().int(),
});
export class RouteDto extends createZodDto(routeSchema) {}

const distanceKmSchema = z.number().positive();
const durationMinutesSchema = z.number().int().positive();

export const createRouteBodySchema = z.object({
  companyId: z.number().int().positive(),
  fromStationId: z.number().int().positive(),
  toStationId: z.number().int().positive(),
  distanceKm: distanceKmSchema,
  durationMinutes: durationMinutesSchema,
});
export class CreateRouteBodyDto extends createZodDto(createRouteBodySchema) {}

/**
 * fromStationId/toStationId are intentionally excluded — they're immutable.
 * Create a new route instead of mutating endpoints.
 */
export const updateRouteBodySchema = z
  .object({
    distanceKm: distanceKmSchema.optional(),
    durationMinutes: durationMinutesSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });
export class UpdateRouteBodyDto extends createZodDto(updateRouteBodySchema) {}

export const routeSearchQuerySchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  fromStationId: z.coerce.number().int().positive().optional(),
  toStationId: z.coerce.number().int().positive().optional(),
});
export class RouteSearchQueryDto extends createZodDto(routeSearchQuerySchema) {}
