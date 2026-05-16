import type { Operator } from '../../domain/entities/operator.entity';
import { isOperatorStatus, type OperatorStatus } from '../../domain/enums';
import {
  IOperatorsRepository,
  type CreateOperatorInput,
  type UpdateOperatorInput,
} from '../../domain/interfaces/operators.repository';

import type { BusCompanyModel } from '@/generated/prisma/models/BusCompany';
import { type DatabaseService } from '@/modules/database/database.service';

export class OperatorsRepositoryPrisma extends IOperatorsRepository {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  private toEntity(row: BusCompanyModel): Operator {
    return {
      id: row.id,
      name: row.name,
      hotline: row.hotline,
      logo: row.logo,
      status: isOperatorStatus(row.status) ? row.status : 'pending',
    };
  }

  async findById(id: number): Promise<Operator | null> {
    const row = await this.db.busCompany.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByName(name: string): Promise<Operator | null> {
    const row = await this.db.busCompany.findUnique({ where: { name } });
    return row ? this.toEntity(row) : null;
  }

  async listAll(): Promise<Operator[]> {
    const rows = await this.db.busCompany.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => this.toEntity(r));
  }

  async listByStatus(status: OperatorStatus): Promise<Operator[]> {
    const rows = await this.db.busCompany.findMany({
      where: { status },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(input: CreateOperatorInput): Promise<Operator> {
    const row = await this.db.busCompany.create({
      data: {
        name: input.name,
        hotline: input.hotline,
        logo: input.logo ?? null,
      },
    });
    return this.toEntity(row);
  }

  async update(id: number, input: UpdateOperatorInput): Promise<Operator> {
    const row = await this.db.busCompany.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.hotline !== undefined && { hotline: input.hotline }),
        ...(input.logo !== undefined && { logo: input.logo }),
      },
    });
    return this.toEntity(row);
  }

  async setStatus(id: number, status: OperatorStatus): Promise<Operator> {
    const row = await this.db.busCompany.update({ where: { id }, data: { status } });
    return this.toEntity(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.busCompany.delete({ where: { id } });
  }
}
