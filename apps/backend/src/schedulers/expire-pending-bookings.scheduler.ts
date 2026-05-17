import { Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { IBookingsRepository } from '@/modules/bookings/domain/interfaces/bookings.repository';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';

/**
 * 10-minute TTL before a pending booking is considered abandoned.
 * Aligns with the Redis lock TTL on POST /bookings.
 */
const PENDING_TTL_MS = 10 * 60 * 1000;
const CRON_EVERY_30_SECONDS = '*/30 * * * * *';

/**
 * Cron job: expire pending bookings older than {@link PENDING_TTL_MS}.
 *
 * On each tick:
 *   1. Query pending bookings whose createdAt + TTL < now
 *   2. For each: release Redis seat lock then mark booking 'expired'
 *
 * Self-registers its cron via SchedulerRegistry (no @Injectable on the job
 * class; this scheduler wraps the work and is wired via useFactory).
 */
export class ExpirePendingBookingsScheduler implements OnModuleInit {
  private readonly logger = new Logger(ExpirePendingBookingsScheduler.name);

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly bookings: IBookingsRepository,
    private readonly seatLock: ISeatLockService,
  ) {}

  onModuleInit(): void {
    const cron = new CronJob(CRON_EVERY_30_SECONDS, () => {
      void this.run();
    });
    this.scheduler.addCronJob('expire-pending-bookings', cron);
    cron.start();
  }

  /** Exposed for tests + manual invocation. */
  async run(): Promise<void> {
    const cutoff = new Date(Date.now() - PENDING_TTL_MS);

    let expired: Awaited<ReturnType<IBookingsRepository['findPendingOlderThan']>>;
    try {
      expired = await this.bookings.findPendingOlderThan(cutoff);
    } catch (err) {
      this.logger.error('Failed to query pending bookings for expiry', err);
      return;
    }

    if (expired.length === 0) return;

    this.logger.log(`Expiring ${expired.length} pending booking(s)`);

    for (const booking of expired) {
      try {
        const seatIds = booking.seats.map((s) => s.seatId);
        await this.seatLock.release(booking.tripId, seatIds, booking.bookingCode);
        await this.bookings.setStatus(booking.id, 'expired');
        this.logger.log(`Expired booking ${booking.bookingCode}`);
      } catch (err) {
        this.logger.error(`Failed to expire booking ${booking.bookingCode}`, err);
      }
    }
  }
}
