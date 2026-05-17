import { Module } from '@nestjs/common';

import { CryptoModule } from '@/modules/crypto/crypto.module';
import { EncryptionService } from '@/modules/crypto/encryption.service';
import { DatabaseService } from '@/modules/database/database.service';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { SeatLockModule } from '@/modules/seat-lock/seat-lock.module';
import { ITripsRepository } from '@/modules/trips/domain/interfaces/trips.repository';
import { TripsModule } from '@/modules/trips/trips.module';

import { BookingsService } from './application/services/bookings.service';
import { IBookingsRepository } from './domain/interfaces/bookings.repository';
import { IBookingsService } from './domain/interfaces/bookings.service';
import { BookingsRepositoryPrisma } from './infrastructure/repositories/bookings.repository.prisma';

// Scheduled jobs (expire pending bookings) live in src/schedulers — this
// module exports its repository + service so SchedulersModule can wire them.
@Module({
  imports: [SeatLockModule, CryptoModule, TripsModule],
  providers: [
    {
      provide: IBookingsRepository,
      useFactory: (db: DatabaseService) => new BookingsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: IBookingsService,
      useFactory: (
        repo: IBookingsRepository,
        seatLock: ISeatLockService,
        encryption: EncryptionService,
        trips: ITripsRepository,
      ) => new BookingsService(repo, seatLock, encryption, trips),
      inject: [IBookingsRepository, ISeatLockService, EncryptionService, ITripsRepository],
    },
  ],
  exports: [IBookingsService, IBookingsRepository],
})
export class BookingsModule {}
