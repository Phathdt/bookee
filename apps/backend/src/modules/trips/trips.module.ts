import { forwardRef, Module } from '@nestjs/common';

import { TripsService } from './application/services/trips.service';
import { ITripsRepository } from './domain/interfaces/trips.repository';
import { ITripsService } from './domain/interfaces/trips.service';
import { TripsRepositoryPrisma } from './infrastructure/repositories/trips.repository.prisma';

import { DatabaseService } from '@/modules/database/database.service';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { IBookingsRepository } from '@/modules/bookings/domain/interfaces/bookings.repository';
import { IRoutesRepository } from '@/modules/routes/domain/interfaces/routes.repository';
import { RoutesModule } from '@/modules/routes/routes.module';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { SeatLockModule } from '@/modules/seat-lock/seat-lock.module';
import { IVehiclesRepository } from '@/modules/vehicles/domain/interfaces/vehicles.repository';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';

// forwardRef breaks the TripsModule ↔ BookingsModule circular dependency:
// BookingsModule imports TripsModule (to read trip.basePrice on create),
// TripsModule imports BookingsModule (to count paid seats for availableSeats).
@Module({
  imports: [RoutesModule, VehiclesModule, SeatLockModule, forwardRef(() => BookingsModule)],
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
        bookingsRepo: IBookingsRepository,
      ) => new TripsService(repo, routes, vehicles, seatLock, bookingsRepo),
      inject: [
        ITripsRepository,
        IRoutesRepository,
        IVehiclesRepository,
        ISeatLockService,
        IBookingsRepository,
      ],
    },
  ],
  exports: [ITripsService, ITripsRepository],
})
export class TripsModule {}
