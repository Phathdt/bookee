import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { TRIP_STATUSES } from '@/modules/trips/domain/enums';

export const tripStatusSchema = z.enum(TRIP_STATUSES);

export const tripDtoSchema = z.object({
  id: z.number().int(),
  routeId: z.number().int(),
  vehicleId: z.number().int(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  basePrice: z.number().int(),
  status: tripStatusSchema,
});
export class TripDto extends createZodDto(tripDtoSchema) {}

export const createTripBodySchema = z.object({
  routeId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  basePrice: z.number().int().nonnegative(),
});
export class CreateTripBodyDto extends createZodDto(createTripBodySchema) {}

export const bulkCreateTripsBodySchema = z.object({
  routeId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  basePrice: z.number().int().nonnegative(),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD'),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end must be YYYY-MM-DD'),
  }),
  dailyDepartureTime: z.string().regex(/^\d{2}:\d{2}$/, 'dailyDepartureTime must be HH:mm'),
  tripDurationMinutes: z.number().int().positive(),
});
export class BulkCreateTripsBodyDto extends createZodDto(bulkCreateTripsBodySchema) {}

export const setTripStatusBodySchema = z.object({
  status: tripStatusSchema,
});
export class SetTripStatusBodyDto extends createZodDto(setTripStatusBodySchema) {}

export const tripSearchQuerySchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  routeId: z.coerce.number().int().positive().optional(),
  status: tripStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export class TripSearchQueryDto extends createZodDto(tripSearchQuerySchema) {}
