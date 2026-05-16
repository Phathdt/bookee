import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeUserRepository } from '../../../../../test/factories/user-repository.fake';
import { UserConflictError, UserNotFoundError } from '../../domain/errors';

import { UsersService } from './users.service';

import type { User } from '@/modules/auth/domain/entities/user.entity';
import type { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';

describe('UsersService', () => {
  let users: IUserRepository;
  let service: UsersService;
  let me: User;

  beforeEach(async () => {
    users = makeFakeUserRepository();
    service = new UsersService(users);
    me = await users.create({
      name: 'Me',
      phone: '0900100001',
      email: 'me@example.com',
      passwordHash: 'h',
    });
  });

  describe('getMe', () => {
    it('returns the public projection of the current user', async () => {
      const result = await service.getMe(me.id);
      expect(result.email).toBe('me@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws UserNotFoundError when user is gone', async () => {
      await expect(service.getMe(99_999)).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });

  describe('updateMe', () => {
    it('updates name and returns refreshed projection', async () => {
      const result = await service.updateMe(me.id, { name: 'Renamed' });
      expect(result.name).toBe('Renamed');
    });

    it('accepts changing email when no one else has it', async () => {
      const result = await service.updateMe(me.id, { email: 'new-me@example.com' });
      expect(result.email).toBe('new-me@example.com');
    });

    it('rejects email change colliding with another user', async () => {
      await users.create({
        name: 'Other',
        phone: '0900100002',
        email: 'other@example.com',
        passwordHash: 'h',
      });
      await expect(service.updateMe(me.id, { email: 'other@example.com' })).rejects.toBeInstanceOf(
        UserConflictError,
      );
    });

    it('rejects phone change colliding with another user', async () => {
      await users.create({
        name: 'Other',
        phone: '0900100003',
        email: 'other2@example.com',
        passwordHash: 'h',
      });
      await expect(service.updateMe(me.id, { phone: '0900100003' })).rejects.toBeInstanceOf(
        UserConflictError,
      );
    });

    it('allows setting email to your own existing email (no-op clash)', async () => {
      const result = await service.updateMe(me.id, { email: 'me@example.com' });
      expect(result.email).toBe('me@example.com');
    });

    it('allows setting phone to your own existing phone (no-op clash)', async () => {
      const result = await service.updateMe(me.id, { phone: '0900100001' });
      expect(result.phone).toBe('0900100001');
    });

    it('updates phone only (other fields untouched)', async () => {
      const result = await service.updateMe(me.id, { phone: '0900999999' });
      expect(result.phone).toBe('0900999999');
      expect(result.email).toBe('me@example.com');
    });

    it('throws UserNotFoundError when user vanished between checks', async () => {
      await expect(service.updateMe(99_999, { name: 'Ghost' })).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });
  });
});
