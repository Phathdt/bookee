import { Operator } from '../entities/operator.entity';
import { OperatorStatus } from '../enums';

import { PublicUser } from '@/modules/auth/domain/entities/user.entity';

export interface CreateOperatorInput {
  name: string;
  hotline: string;
  logo?: string | null;
}

export interface UpdateOperatorInput {
  name?: string;
  hotline?: string;
  logo?: string | null;
}

export interface AssignStaffInput {
  userId: number;
  role: 'operator' | 'driver';
}

/**
 * Operator (bus company) service port. Admin lifecycle + public read +
 * staff assignment, all in one application service.
 */
export abstract class IOperatorsService {
  abstract list(): Promise<Operator[]>;
  abstract listActive(): Promise<Operator[]>;
  abstract getById(id: number): Promise<Operator>;
  abstract create(input: CreateOperatorInput): Promise<Operator>;
  abstract update(id: number, input: UpdateOperatorInput): Promise<Operator>;
  abstract setStatus(id: number, status: OperatorStatus): Promise<Operator>;
  abstract delete(id: number): Promise<void>;
  abstract assignStaff(operatorId: number, input: AssignStaffInput): Promise<PublicUser>;
}
