import { beforeEach, describe, expect, it } from 'vitest';

import { makeFakeOperatorsRepository } from '../../../../../test/factories/operators-repository.fake';
import { makeFakeUserRepository } from '../../../../../test/factories/user-repository.fake';
import {
  OperatorConflictError,
  OperatorNotActiveError,
  OperatorNotFoundError,
} from '../../domain/errors';
import type { IOperatorsRepository } from '../../domain/interfaces/operators.repository';

import { OperatorsService } from './operators.service';

import type { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';
import { UserNotFoundError } from '@/modules/users/domain/errors';

describe('OperatorsService', () => {
  let operators: IOperatorsRepository;
  let users: IUserRepository;
  let service: OperatorsService;

  beforeEach(() => {
    operators = makeFakeOperatorsRepository();
    users = makeFakeUserRepository();
    service = new OperatorsService(operators, users);
  });

  describe('create / list', () => {
    it('creates an operator with pending status', async () => {
      const op = await service.create({ name: 'Futa', hotline: '19001234' });
      expect(op).toMatchObject({ name: 'Futa', status: 'pending', logo: null });
    });

    it('rejects duplicate name', async () => {
      await service.create({ name: 'Futa', hotline: '19001234' });
      await expect(service.create({ name: 'Futa', hotline: '19009999' })).rejects.toBeInstanceOf(
        OperatorConflictError,
      );
    });

    it('list returns every operator', async () => {
      await service.create({ name: 'A', hotline: '19001000' });
      await service.create({ name: 'B', hotline: '19002000' });
      expect((await service.list()).map((o) => o.name)).toEqual(['A', 'B']);
    });

    it('listActive filters by status', async () => {
      const a = await service.create({ name: 'A', hotline: '19001000' });
      await service.create({ name: 'B', hotline: '19002000' });
      await service.setStatus(a.id, 'active');
      expect((await service.listActive()).map((o) => o.name)).toEqual(['A']);
    });
  });

  describe('getById', () => {
    it('returns the operator', async () => {
      const created = await service.create({ name: 'A', hotline: '19001000' });
      expect((await service.getById(created.id)).name).toBe('A');
    });

    it('throws OperatorNotFoundError on missing id', async () => {
      await expect(service.getById(99_999)).rejects.toBeInstanceOf(OperatorNotFoundError);
    });
  });

  describe('update', () => {
    it('updates hotline', async () => {
      const created = await service.create({ name: 'A', hotline: '19001000' });
      const updated = await service.update(created.id, { hotline: '19002000' });
      expect(updated.hotline).toBe('19002000');
    });

    it('allows renaming to the same name (no clash)', async () => {
      const created = await service.create({ name: 'A', hotline: '19001000' });
      const updated = await service.update(created.id, { name: 'A' });
      expect(updated.name).toBe('A');
    });

    it('rejects rename colliding with another operator', async () => {
      await service.create({ name: 'A', hotline: '19001000' });
      const b = await service.create({ name: 'B', hotline: '19002000' });
      await expect(service.update(b.id, { name: 'A' })).rejects.toBeInstanceOf(
        OperatorConflictError,
      );
    });

    it('throws when target operator does not exist', async () => {
      await expect(service.update(99_999, { name: 'Ghost' })).rejects.toBeInstanceOf(
        OperatorNotFoundError,
      );
    });
  });

  describe('setStatus / delete', () => {
    it('activates pending operator', async () => {
      const created = await service.create({ name: 'A', hotline: '19001000' });
      const activated = await service.setStatus(created.id, 'active');
      expect(activated.status).toBe('active');
    });

    it('setStatus throws if operator missing', async () => {
      await expect(service.setStatus(99_999, 'active')).rejects.toBeInstanceOf(
        OperatorNotFoundError,
      );
    });

    it('delete removes the operator', async () => {
      const created = await service.create({ name: 'A', hotline: '19001000' });
      await service.delete(created.id);
      await expect(service.getById(created.id)).rejects.toBeInstanceOf(OperatorNotFoundError);
    });

    it('delete throws if operator missing', async () => {
      await expect(service.delete(99_999)).rejects.toBeInstanceOf(OperatorNotFoundError);
    });
  });

  describe('assignStaff', () => {
    it('attaches user to operator with the requested role', async () => {
      const op = await service.create({ name: 'A', hotline: '19001000' });
      await service.setStatus(op.id, 'active');
      const user = await users.create({
        name: 'Staff',
        phone: '0900111000',
        email: 'staff@bookee.local',
        passwordHash: 'h',
      });
      const result = await service.assignStaff(op.id, { userId: user.id, role: 'operator' });
      expect(result.operatorId).toBe(op.id);
      expect(result.role).toBe('operator');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects assigning to non-active operator', async () => {
      const op = await service.create({ name: 'A', hotline: '19001000' });
      const user = await users.create({
        name: 'Staff',
        phone: '0900111001',
        email: 'staff2@bookee.local',
        passwordHash: 'h',
      });
      await expect(
        service.assignStaff(op.id, { userId: user.id, role: 'driver' }),
      ).rejects.toBeInstanceOf(OperatorNotActiveError);
    });

    it('throws when operator does not exist', async () => {
      const user = await users.create({
        name: 'Staff',
        phone: '0900111002',
        email: 'staff3@bookee.local',
        passwordHash: 'h',
      });
      await expect(
        service.assignStaff(99_999, { userId: user.id, role: 'driver' }),
      ).rejects.toBeInstanceOf(OperatorNotFoundError);
    });

    it('throws when user does not exist', async () => {
      const op = await service.create({ name: 'A', hotline: '19001000' });
      await service.setStatus(op.id, 'active');
      await expect(
        service.assignStaff(op.id, { userId: 99_999, role: 'driver' }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });
});
