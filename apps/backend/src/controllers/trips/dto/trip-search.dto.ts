import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

const stationInfoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
});

const companyInfoSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const routeInfoSchema = z.object({
  id: z.number().int(),
  distanceKm: z.number(),
  durationMinutes: z.number().int(),
  fromStation: stationInfoSchema,
  toStation: stationInfoSchema,
  company: companyInfoSchema,
});

const vehicleInfoSchema = z.object({
  id: z.number().int(),
  plateNumber: z.string(),
  type: z.string(),
  totalSeats: z.number().int(),
});

const tripInfoSchema = z.object({
  id: z.number().int(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  basePrice: z.number().int(),
  status: z.string(),
});

export const tripSearchResultDtoSchema = z.object({
  trip: tripInfoSchema,
  route: routeInfoSchema,
  vehicle: vehicleInfoSchema,
  availableSeats: z.number().int(),
});

export const tripSearchPageDtoSchema = z.object({
  items: z.array(tripSearchResultDtoSchema),
  nextCursor: z.string().nullable(),
});
export class TripSearchPageDto extends createZodDto(tripSearchPageDtoSchema) {}

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

/**
 * Coerce a query-string value into an array of positive integers.
 * Accepts: "1,2,3"  or  "1"  or  ["1","2"]  (multi-param).
 */
const coerceIntArray = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const arr = Array.isArray(val) ? val : String(val).split(',');
  return arr.map((v) => Number(String(v).trim())).filter((n) => !isNaN(n) && n > 0);
}, z.array(z.number().int().positive()).optional());

export const tripSearchQueryDtoSchema = z.object({
  /** Origin city — matches route's fromStation.city (case-sensitive exact match) */
  from: z.string().min(1).max(120),
  /** Destination city — matches route's toStation.city */
  to: z.string().min(1).max(120),
  /** Travel date in YYYY-MM-DD (UTC day bounds applied server-side) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  /** Filter by operator ID(s). Comma-separated or repeated param. */
  operatorId: coerceIntArray,
  /** Filter by vehicle type (e.g. sleeper, limousine) */
  vehicleType: z.string().min(1).optional(),
  /** Minimum base price in VND (inclusive) */
  priceMin: z.coerce.number().int().nonnegative().optional(),
  /** Maximum base price in VND (inclusive) */
  priceMax: z.coerce.number().int().nonnegative().optional(),
  /** Sort field — default: departureTime */
  sort: z.enum(['departureTime', 'price', 'duration']).default('departureTime'),
  /** Page size (1–50, default 20) */
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Opaque base64url cursor from previous page's nextCursor */
  cursor: z.string().optional(),
});
export class TripSearchQueryDto extends createZodDto(tripSearchQueryDtoSchema) {}
