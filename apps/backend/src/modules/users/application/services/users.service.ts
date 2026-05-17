import { UserConflictError, UserNotFoundError } from '../../domain/errors';
import { IUsersService, UpdateProfileInput } from '../../domain/interfaces/users.service';

import { PublicUser, toPublicUser } from '@/modules/auth/domain/entities/user.entity';
import { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';

// Framework-agnostic. Nest DI wires this via useFactory in users.module.ts.
export class UsersService implements IUsersService {
  constructor(private readonly users: IUserRepository) {}

  async getMe(userId: number): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();
    return toPublicUser(user);
  }

  async updateMe(userId: number, input: UpdateProfileInput): Promise<PublicUser> {
    if (input.email !== undefined) {
      const clash = await this.users.findByEmail(input.email);
      if (clash && clash.id !== userId) throw new UserConflictError('email already in use');
    }
    if (input.phone !== undefined) {
      const clash = await this.users.findByPhone(input.phone);
      if (clash && clash.id !== userId) throw new UserConflictError('phone already in use');
    }

    const existing = await this.users.findById(userId);
    if (!existing) throw new UserNotFoundError();

    const updated = await this.users.update(userId, input);
    return toPublicUser(updated);
  }
}
