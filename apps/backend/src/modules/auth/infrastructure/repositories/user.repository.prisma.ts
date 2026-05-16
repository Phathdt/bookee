import type { User } from '../../domain/entities/user.entity';
import { isUserRole } from '../../domain/enums';
import {
  IUserRepository,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../domain/interfaces/user.repository';

import type { UserModel } from '@/generated/prisma/models/User';
import { type DatabaseService } from '@/modules/database/database.service';

/**
 * Prisma adapter for IUserRepository.
 *
 * Holds the whole DatabaseService and reaches `db.user` internally — keeps
 * constructor call sites simple and lets the repo grow into joined queries
 * later without re-plumbing extra delegates through the module factory.
 *
 * Lifts every DB row into a User entity at the boundary so the application
 * layer never sees Prisma-shaped data.
 */
export class UserRepositoryPrisma extends IUserRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: UserModel): User {
    return { ...row, role: isUserRole(row.role) ? row.role : 'customer' };
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { phone } });
    return row ? this.toEntity(row) : null;
  }

  async findByPhoneOrEmail(identifier: string): Promise<User | null> {
    const row = await this.db.user.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier }] },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const row = await this.db.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? 'customer',
      },
    });
    return this.toEntity(row);
  }

  async update(id: number, input: UpdateUserInput): Promise<User> {
    const row = await this.db.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.operatorId !== undefined && { operatorId: input.operatorId }),
      },
    });
    return this.toEntity(row);
  }
}
