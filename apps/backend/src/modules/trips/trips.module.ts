import { Module } from '@nestjs/common';

import { TripsService } from './application/services/trips.service';
import { ITripsRepository } from './domain/interfaces/trips.repository';
import { ITripsService } from './domain/interfaces/trips.service';
import { TripsRepositoryPrisma } from './infrastructure/repositories/trips.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';
import { IRoutesRepository } from '@/modules/routes/domain/interfaces/routes.repository';
import { RoutesModule } from '@/modules/routes/routes.module';
import { IVehiclesRepository } from '@/modules/vehicles/domain/interfaces/vehicles.repository';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';

@Module({
  imports: [RoutesModule, VehiclesModule],
  providers: [
    {
      provide: ITripsRepository,
      useFactory: (db: DatabaseService) => new TripsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: ITripsService,
      useFactory: (
        repo: ITripsRepository,
        routes: IRoutesRepository,
        vehicles: IVehiclesRepository,
      ) => new TripsService(repo, routes, vehicles),
      inject: [ITripsRepository, IRoutesRepository, IVehiclesRepository],
    },
  ],
  exports: [ITripsService, ITripsRepository],
})
export class TripsModule {}
