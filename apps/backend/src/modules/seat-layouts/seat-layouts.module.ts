import { Module } from '@nestjs/common';

import { SeatLayoutsService } from './application/services/seat-layouts.service';
import { ISeatLayoutsRepository } from './domain/interfaces/seat-layouts.repository';
import { ISeatLayoutsService } from './domain/interfaces/seat-layouts.service';
import { SeatLayoutsRepositoryPrisma } from './infrastructure/repositories/seat-layouts.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';

@Module({
  providers: [
    {
      provide: ISeatLayoutsRepository,
      useFactory: (db: DatabaseService) => new SeatLayoutsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: ISeatLayoutsService,
      useFactory: (repo: ISeatLayoutsRepository) => new SeatLayoutsService(repo),
      inject: [ISeatLayoutsRepository],
    },
  ],
  exports: [ISeatLayoutsService, ISeatLayoutsRepository],
})
export class SeatLayoutsModule {}
