import type { User } from '@/modules/auth/domain/entities/user.entity';
import type {
  CreateUserInput,
  IUserRepository,
  UpdateUserInput,
} from '@/modules/auth/domain/interfaces/user.repository';

/**
 * In-memory IUserRepository for unit tests. Behaves like the Prisma adapter
 * for the surface our services touch: unique-by-email/phone, role coercion,
 * mutable update — without spinning up a DB.
 *
 * Shared between auth and users module specs so behavior stays consistent.
 */
export function makeFakeUserRepository(): IUserRepository {
  const rows = new Map<number, User>();
  let nextId = 1;

  return {
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async findByEmail(email) {
      return [...rows.values()].find((r) => r.email === email) ?? null;
    },
    async findByPhone(phone) {
      return [...rows.values()].find((r) => r.phone === phone) ?? null;
    },
    async findByPhoneOrEmail(identifier) {
      return (
        [...rows.values()].find((r) => r.phone === identifier || r.email === identifier) ?? null
      );
    },
    async create(input: CreateUserInput) {
      const u: User = {
        id: nextId++,
        name: input.name,
        phone: input.phone,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? 'customer',
        operatorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.set(u.id, u);
      return u;
    },
    async update(id: number, input: UpdateUserInput) {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: User = {
        ...existing,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email }),
        updatedAt: new Date(),
      };
      rows.set(id, updated);
      return updated;
    },
  } satisfies IUserRepository;
}
