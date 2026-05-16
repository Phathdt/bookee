import type { Operator } from '../../domain/entities/operator.entity';
import type { OperatorStatus } from '../../domain/enums';
import {
  OperatorConflictError,
  OperatorNotActiveError,
  OperatorNotFoundError,
} from '../../domain/errors';
import type { IOperatorsRepository } from '../../domain/interfaces/operators.repository';
import type {
  AssignStaffInput,
  CreateOperatorInput,
  IOperatorsService,
  UpdateOperatorInput,
} from '../../domain/interfaces/operators.service';

import { toPublicUser, type PublicUser } from '@/modules/auth/domain/entities/user.entity';
import type { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';
import { UserNotFoundError } from '@/modules/users/domain/errors';

// Framework-agnostic — wired via useFactory in operators.module.ts.
export class OperatorsService implements IOperatorsService {
  constructor(
    private readonly operators: IOperatorsRepository,
    private readonly users: IUserRepository,
  ) {}

  list(): Promise<Operator[]> {
    return this.operators.listAll();
  }

  listActive(): Promise<Operator[]> {
    return this.operators.listByStatus('active');
  }

  async getById(id: number): Promise<Operator> {
    const op = await this.operators.findById(id);
    if (!op) throw new OperatorNotFoundError();
    return op;
  }

  async create(input: CreateOperatorInput): Promise<Operator> {
    const clash = await this.operators.findByName(input.name);
    if (clash) throw new OperatorConflictError('operator name already exists');
    return this.operators.create(input);
  }

  async update(id: number, input: UpdateOperatorInput): Promise<Operator> {
    const existing = await this.operators.findById(id);
    if (!existing) throw new OperatorNotFoundError();
    if (input.name !== undefined && input.name !== existing.name) {
      const clash = await this.operators.findByName(input.name);
      if (clash && clash.id !== id) {
        throw new OperatorConflictError('operator name already exists');
      }
    }
    return this.operators.update(id, input);
  }

  async setStatus(id: number, status: OperatorStatus): Promise<Operator> {
    const existing = await this.operators.findById(id);
    if (!existing) throw new OperatorNotFoundError();
    return this.operators.setStatus(id, status);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.operators.findById(id);
    if (!existing) throw new OperatorNotFoundError();
    return this.operators.delete(id);
  }

  async assignStaff(operatorId: number, input: AssignStaffInput): Promise<PublicUser> {
    const operator = await this.operators.findById(operatorId);
    if (!operator) throw new OperatorNotFoundError();
    if (operator.status !== 'active') {
      throw new OperatorNotActiveError('cannot assign staff to non-active operator');
    }

    const user = await this.users.findById(input.userId);
    if (!user) throw new UserNotFoundError();

    const updated = await this.users.update(input.userId, {
      role: input.role,
      operatorId,
    });
    return toPublicUser(updated);
  }
}
