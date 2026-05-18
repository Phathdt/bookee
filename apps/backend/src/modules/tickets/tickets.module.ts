import { Module } from '@nestjs/common';

import { DatabaseService } from '@/modules/database/database.service';

import { ITicketsRepository } from './domain/interfaces/tickets.repository';
import { TicketsRepositoryPrisma } from './infrastructure/repositories/tickets.repository.prisma';

@Module({
  providers: [
    {
      provide: ITicketsRepository,
      useFactory: (db: DatabaseService) => new TicketsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
  ],
  exports: [ITicketsRepository],
})
export class TicketsModule {}
