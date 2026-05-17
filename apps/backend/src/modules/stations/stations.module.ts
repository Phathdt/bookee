import { Module } from '@nestjs/common';

import { StationsService } from './application/services/stations.service';
import { IStationsRepository } from './domain/interfaces/stations.repository';
import { IStationsService } from './domain/interfaces/stations.service';
import { StationsRepositoryPrisma } from './infrastructure/repositories/stations.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';

@Module({
  providers: [
    {
      provide: IStationsRepository,
      useFactory: (db: DatabaseService) => new StationsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IStationsService,
      useFactory: (stations: IStationsRepository) => new StationsService(stations),
      inject: [IStationsRepository],
    },
  ],
  exports: [IStationsService, IStationsRepository],
})
export class StationsModule {}
