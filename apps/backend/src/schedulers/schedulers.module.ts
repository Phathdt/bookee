import { Module } from '@nestjs/common';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';

import { BookingsModule } from '@/modules/bookings/bookings.module';
import { IBookingsRepository } from '@/modules/bookings/domain/interfaces/bookings.repository';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { SeatLockModule } from '@/modules/seat-lock/seat-lock.module';

import { ExpirePendingBookingsScheduler } from './expire-pending-bookings.scheduler';

/**
 * Top-level home for cross-cutting cron jobs / processors. Schedulers depend
 * on feature modules (Bookings, SeatLock, …) but the feature modules don't
 * know about scheduling — that responsibility lives here.
 *
 * Add new schedulers by importing dependencies + registering a useFactory
 * provider. ScheduleModule.forRoot() is registered once at this level.
 */
@Module({
  imports: [ScheduleModule.forRoot(), BookingsModule, SeatLockModule],
  providers: [
    {
      provide: ExpirePendingBookingsScheduler,
      useFactory: (
        scheduler: SchedulerRegistry,
        bookings: IBookingsRepository,
        seatLock: ISeatLockService,
      ) => new ExpirePendingBookingsScheduler(scheduler, bookings, seatLock),
      inject: [SchedulerRegistry, IBookingsRepository, ISeatLockService],
    },
  ],
})
export class SchedulersModule {}
