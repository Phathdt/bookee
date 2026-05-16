import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// All DTOs derive from Zod schemas; nestjs-zod auto-validates at boundary
// and emits OpenAPI schemas via cleanupOpenApiDoc().

const passwordSchema = z.string().min(8).max(72);
const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^[+\d\s-]+$/, 'Invalid phone format');
const emailSchema = z.string().email().max(254);

// ---- Register ----------------------------------------------------------

export const registerBodySchema = z.object({
  name: z.string().min(1).max(120),
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
});
export class RegisterBodyDto extends createZodDto(registerBodySchema) {}

// ---- Login -------------------------------------------------------------

export const loginBodySchema = z.object({
  identifier: z.string().min(1).max(254).describe('phone OR email'),
  password: passwordSchema,
});
export class LoginBodyDto extends createZodDto(loginBodySchema) {}

// ---- Refresh -----------------------------------------------------------

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});
export class RefreshBodyDto extends createZodDto(refreshBodySchema) {}

// ---- Responses ----------------------------------------------------------

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export class AuthTokensDto extends createZodDto(authTokensSchema) {}

export const authenticatedUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'operator', 'driver', 'admin']),
  operatorId: z.number().int().nullable(),
});
export class AuthenticatedUserDto extends createZodDto(authenticatedUserSchema) {}

export const authSessionSchema = z.object({
  user: authenticatedUserSchema,
  tokens: authTokensSchema,
});
export class AuthSessionDto extends createZodDto(authSessionSchema) {}
