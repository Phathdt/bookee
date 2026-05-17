import { Module } from '@nestjs/common';

import { VehiclesService } from './application/services/vehicles.service';
import { IVehiclesRepository } from './domain/interfaces/vehicles.repository';
import { IVehiclesService } from './domain/interfaces/vehicles.service';
import { VehiclesRepositoryPrisma } from './infrastructure/repositories/vehicles.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';
import { ISeatLayoutsRepository } from '@/modules/seat-layouts/domain/interfaces/seat-layouts.repository';
import { SeatLayoutsModule } from '@/modules/seat-layouts/seat-layouts.module';

@Module({
  imports: [SeatLayoutsModule],
  providers: [
    {
      provide: IVehiclesRepository,
      useFactory: (db: DatabaseService) => new VehiclesRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IVehiclesService,
      useFactory: (repo: IVehiclesRepository, seatLayoutsRepo: ISeatLayoutsRepository) =>
        new VehiclesService(repo, seatLayoutsRepo),
      inject: [IVehiclesRepository, ISeatLayoutsRepository],
    },
  ],
  exports: [IVehiclesService, IVehiclesRepository],
})
export class VehiclesModule {}
