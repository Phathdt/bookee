import type { Operator } from '@/modules/operators/domain/entities/operator.entity';
import type { OperatorStatus } from '@/modules/operators/domain/enums';
import {
  type IOperatorsRepository,
  type CreateOperatorInput,
  type UpdateOperatorInput,
} from '@/modules/operators/domain/interfaces/operators.repository';

/** In-memory IOperatorsRepository for unit tests. */
export function makeFakeOperatorsRepository(): IOperatorsRepository {
  const rows = new Map<number, Operator>();
  let nextId = 1;

  return {
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async findByName(name) {
      return [...rows.values()].find((r) => r.name === name) ?? null;
    },
    async listAll() {
      return [...rows.values()].sort((a, b) => a.id - b.id);
    },
    async listByStatus(status: OperatorStatus) {
      return [...rows.values()].filter((r) => r.status === status).sort((a, b) => a.id - b.id);
    },
    async create(input: CreateOperatorInput) {
      const op: Operator = {
        id: nextId++,
        name: input.name,
        hotline: input.hotline,
        logo: input.logo ?? null,
        status: 'pending',
      };
      rows.set(op.id, op);
      return op;
    },
    async update(id: number, input: UpdateOperatorInput) {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: Operator = {
        ...existing,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.hotline !== undefined && { hotline: input.hotline }),
        ...(input.logo !== undefined && { logo: input.logo }),
      };
      rows.set(id, updated);
      return updated;
    },
    async setStatus(id: number, status: OperatorStatus) {
      const existing = rows.get(id);
      if (!existing) throw new Error('not found');
      const updated: Operator = { ...existing, status };
      rows.set(id, updated);
      return updated;
    },
    async delete(id: number) {
      rows.delete(id);
    },
  } satisfies IOperatorsRepository;
}
