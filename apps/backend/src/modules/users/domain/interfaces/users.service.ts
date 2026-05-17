import { PublicUser } from '@/modules/auth/domain/entities/user.entity';

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Users service port — profile management for the authenticated user.
 * Identity / credentials live in the auth module; this one wraps reads +
 * mutations of the public profile fields.
 */
export abstract class IUsersService {
  abstract getMe(userId: number): Promise<PublicUser>;
  abstract updateMe(userId: number, input: UpdateProfileInput): Promise<PublicUser>;
}
