import { Module } from '@nestjs/common';

import { OperatorsService } from './application/services/operators.service';
import { IOperatorsRepository } from './domain/interfaces/operators.repository';
import { IOperatorsService } from './domain/interfaces/operators.service';
import { OperatorsRepositoryPrisma } from './infrastructure/repositories/operators.repository.prisma';

import { AuthModule } from '@/modules/auth/auth.module';
import { IUserRepository } from '@/modules/auth/domain/interfaces/user.repository';
import { DatabaseService } from '@/modules/database/database.service';

@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: IOperatorsRepository,
      useFactory: (db: DatabaseService) => new OperatorsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IOperatorsService,
      useFactory: (ops: IOperatorsRepository, users: IUserRepository) =>
        new OperatorsService(ops, users),
      inject: [IOperatorsRepository, IUserRepository],
    },
  ],
  exports: [IOperatorsService, IOperatorsRepository],
})
export class OperatorsModule {}
