import { Module } from '@nestjs/common';

import { RoutesService } from './application/services/routes.service';
import { IRoutesRepository } from './domain/interfaces/routes.repository';
import { IRoutesService } from './domain/interfaces/routes.service';
import { RoutesRepositoryPrisma } from './infrastructure/repositories/routes.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';

@Module({
  providers: [
    {
      provide: IRoutesRepository,
      useFactory: (db: DatabaseService) => new RoutesRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IRoutesService,
      useFactory: (repo: IRoutesRepository) => new RoutesService(repo),
      inject: [IRoutesRepository],
    },
  ],
  exports: [IRoutesService, IRoutesRepository],
})
export class RoutesModule {}
