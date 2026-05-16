import type { User } from '../entities/user.entity';
import type { UserRole } from '../enums';

export interface CreateUserInput {
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

/**
 * User repository port. Returns User entities — never raw DB rows.
 * Abstract class so it serves as both TS type and NestJS DI token.
 */
export abstract class IUserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByPhone(phone: string): Promise<User | null>;
  abstract findByPhoneOrEmail(identifier: string): Promise<User | null>;
  abstract create(input: CreateUserInput): Promise<User>;
}
