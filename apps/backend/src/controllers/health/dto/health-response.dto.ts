import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Liveness response schema. Single source of truth: define once in Zod,
 * derive (a) NestJS DTO class with auto-generated OpenAPI schema, and
 * (b) static TS type for use in handlers / clients.
 */
export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .describe('Liveness probe response — status is always "ok" when up');

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}

export type HealthResponse = z.infer<typeof healthResponseSchema>;
