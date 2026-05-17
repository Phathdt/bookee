import { PublicUser } from '../entities/user.entity';

export interface RegisterInput {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginInput {
  identifier: string; // phone OR email
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  user: PublicUser;
  tokens: AuthTokens;
}

/**
 * Auth service port. Declared as abstract class so it doubles as both the
 * TypeScript type and the NestJS DI token (no separate Symbol needed).
 */
export abstract class IAuthService {
  abstract register(input: RegisterInput): Promise<AuthSession>;
  abstract login(input: LoginInput): Promise<AuthSession>;
  abstract refresh(refreshToken: string): Promise<AuthTokens>;
}
