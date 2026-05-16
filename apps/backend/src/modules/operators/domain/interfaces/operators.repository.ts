import type { Operator } from '../entities/operator.entity';
import type { OperatorStatus } from '../enums';

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

export abstract class IOperatorsRepository {
  abstract findById(id: number): Promise<Operator | null>;
  abstract findByName(name: string): Promise<Operator | null>;
  abstract listAll(): Promise<Operator[]>;
  abstract listByStatus(status: OperatorStatus): Promise<Operator[]>;
  abstract create(input: CreateOperatorInput): Promise<Operator>;
  abstract update(id: number, input: UpdateOperatorInput): Promise<Operator>;
  abstract setStatus(id: number, status: OperatorStatus): Promise<Operator>;
  abstract delete(id: number): Promise<void>;
}
