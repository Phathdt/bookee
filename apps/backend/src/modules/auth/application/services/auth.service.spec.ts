import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '../../domain/entities/user.entity';
import { AuthConflictError, AuthUnauthorizedError } from '../../domain/errors';
import type { IJwtSigner } from '../../domain/interfaces/jwt-signer';
import type { CreateUserInput, IUserRepository } from '../../domain/interfaces/user.repository';
import type { JwtPayload } from '../../domain/jwt-payload';
import { PasswordHash } from '../../domain/password-hash';

import { AuthService } from './auth.service';

// In-memory IUserRepository fake. Beats mock+spy boilerplate and gives us
// realistic constraints (unique-by-email, unique-by-phone) without touching DB.
function makeUsers(): IUserRepository {
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
    async findByPhoneOrEmail(id) {
      return [...rows.values()].find((r) => r.phone === id || r.email === id) ?? null;
    },
    async create(input: CreateUserInput) {
      const user: User = {
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
      rows.set(user.id, user);
      return user;
    },
  } satisfies IUserRepository;
}

// Trivial JWT signer fake: encodes payload as JSON; verify decodes it. No
// crypto needed — service-level tests only care about round-trip + typ.
function makeJwt(): IJwtSigner {
  return {
    async sign(payload) {
      return Buffer.from(JSON.stringify(payload)).toString('base64');
    },
    async verify(token) {
      return JSON.parse(Buffer.from(token, 'base64').toString()) as JwtPayload;
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let users: IUserRepository;
  let jwt: IJwtSigner;

  beforeEach(() => {
    users = makeUsers();
    jwt = makeJwt();
    service = new AuthService(users, jwt);
  });

  describe('register', () => {
    it('creates a user and returns access+refresh tokens', async () => {
      const session = await service.register({
        name: 'Alice',
        phone: '0900111000',
        email: 'alice@example.com',
        password: 'sup3rsecure',
      });

      expect(session.user).toMatchObject({
        name: 'Alice',
        phone: '0900111000',
        email: 'alice@example.com',
        role: 'customer',
        operatorId: null,
      });
      expect(session.user).not.toHaveProperty('passwordHash');
      expect(session.tokens.accessToken).toBeTruthy();
      expect(session.tokens.refreshToken).toBeTruthy();
    });

    it('rejects duplicate email', async () => {
      await service.register({
        name: 'A',
        phone: '0900000001',
        email: 'dup@example.com',
        password: 'sup3rsecure',
      });
      await expect(
        service.register({
          name: 'B',
          phone: '0900000002',
          email: 'dup@example.com',
          password: 'sup3rsecure',
        }),
      ).rejects.toBeInstanceOf(AuthConflictError);
    });

    it('rejects duplicate phone', async () => {
      await service.register({
        name: 'A',
        phone: '0900000003',
        email: 'a@example.com',
        password: 'sup3rsecure',
      });
      await expect(
        service.register({
          name: 'B',
          phone: '0900000003',
          email: 'b@example.com',
          password: 'sup3rsecure',
        }),
      ).rejects.toBeInstanceOf(AuthConflictError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register({
        name: 'Bob',
        phone: '0900222000',
        email: 'bob@example.com',
        password: 'correctpass',
      });
    });

    it('accepts correct credentials via email', async () => {
      const session = await service.login({
        identifier: 'bob@example.com',
        password: 'correctpass',
      });
      expect(session.user.email).toBe('bob@example.com');
    });

    it('accepts correct credentials via phone', async () => {
      const session = await service.login({
        identifier: '0900222000',
        password: 'correctpass',
      });
      expect(session.user.email).toBe('bob@example.com');
    });

    it('rejects wrong password with Unauthorized', async () => {
      await expect(
        service.login({ identifier: 'bob@example.com', password: 'wrongpass' }),
      ).rejects.toBeInstanceOf(AuthUnauthorizedError);
    });

    it('rejects unknown identifier with Unauthorized', async () => {
      await expect(
        service.login({ identifier: 'ghost@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(AuthUnauthorizedError);
    });
  });

  describe('refresh', () => {
    it('exchanges a valid refresh token for a fresh pair', async () => {
      const session = await service.register({
        name: 'Carol',
        phone: '0900333000',
        email: 'carol@example.com',
        password: 'sup3rsecure',
      });
      const next = await service.refresh(session.tokens.refreshToken);
      expect(next.accessToken).toBeTruthy();
      expect(next.refreshToken).toBeTruthy();
    });

    it('rejects an access token used as refresh', async () => {
      const session = await service.register({
        name: 'Dan',
        phone: '0900444000',
        email: 'dan@example.com',
        password: 'sup3rsecure',
      });
      await expect(service.refresh(session.tokens.accessToken)).rejects.toBeInstanceOf(
        AuthUnauthorizedError,
      );
    });

    it('rejects a refresh token for a deleted user', async () => {
      const session = await service.register({
        name: 'Eve',
        phone: '0900555000',
        email: 'eve@example.com',
        password: 'sup3rsecure',
      });
      // Spy + override findById to simulate deletion after token issue.
      vi.spyOn(users, 'findById').mockResolvedValueOnce(null);
      await expect(service.refresh(session.tokens.refreshToken)).rejects.toBeInstanceOf(
        AuthUnauthorizedError,
      );
    });
  });

  describe('password hashing', () => {
    it('stored hash is never the plain password', async () => {
      const session = await service.register({
        name: 'Frank',
        phone: '0900666000',
        email: 'frank@example.com',
        password: 'mypassword',
      });
      const row = await users.findById(session.user.id);
      expect(row?.passwordHash).not.toBe('mypassword');
      expect(await PasswordHash.fromStored(row!.passwordHash).matches('mypassword')).toBe(true);
    });
  });
});
