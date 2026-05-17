import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const stationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  city: z.string(),
});
export class StationDto extends createZodDto(stationSchema) {}

const latSchema = z.number().gte(-90).lte(90);
const lngSchema = z.number().gte(-180).lte(180);

export const createStationBodySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  lat: latSchema,
  lng: lngSchema,
  city: z.string().min(1).max(120),
});
export class CreateStationBodyDto extends createZodDto(createStationBodySchema) {}

export const updateStationBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.string().min(1).max(500).optional(),
    lat: latSchema.optional(),
    lng: lngSchema.optional(),
    city: z.string().min(1).max(120).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });
export class UpdateStationBodyDto extends createZodDto(updateStationBodySchema) {}

export const stationSearchQuerySchema = z.object({
  city: z.string().min(1).max(120).optional(),
  q: z.string().min(1).max(200).optional(),
});
export class StationSearchQueryDto extends createZodDto(stationSearchQuerySchema) {}
