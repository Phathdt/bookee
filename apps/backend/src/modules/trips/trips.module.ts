import { Module } from '@nestjs/common';

import { TripsService } from './application/services/trips.service';
import { ITripsRepository } from './domain/interfaces/trips.repository';
import { ITripsService } from './domain/interfaces/trips.service';
import { TripsRepositoryPrisma } from './infrastructure/repositories/trips.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';
import { IRoutesRepository } from '@/modules/routes/domain/interfaces/routes.repository';
import { RoutesModule } from '@/modules/routes/routes.module';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { SeatLockModule } from '@/modules/seat-lock/seat-lock.module';
import { IVehiclesRepository } from '@/modules/vehicles/domain/interfaces/vehicles.repository';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';

@Module({
  imports: [RoutesModule, VehiclesModule, SeatLockModule],
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
        seatLock: ISeatLockService,
      ) => new TripsService(repo, routes, vehicles, seatLock),
      inject: [ITripsRepository, IRoutesRepository, IVehiclesRepository, ISeatLockService],
    },
  ],
  exports: [ITripsService, ITripsRepository],
})
export class TripsModule {}
