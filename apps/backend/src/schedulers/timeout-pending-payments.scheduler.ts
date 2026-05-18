import { Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { IPaymentsRepository } from '@/modules/payments/domain/interfaces/payments.repository';

/**
 * 15-minute TTL before a pending payment is considered timed out.
 * A timed-out payment does NOT affect the booking — booking expiry is
 * handled separately by ExpirePendingBookingsScheduler.
 */
const PENDING_TTL_MS = 15 * 60 * 1000;
const CRON_EVERY_30_SECONDS = '*/30 * * * * *';

/**
 * Cron job: mark payments as 'timeout' when they have been pending longer
 * than {@link PENDING_TTL_MS}.
 *
 * Self-registers via SchedulerRegistry (no @Injectable — wired via useFactory).
 */
export class TimeoutPendingPaymentsScheduler implements OnModuleInit {
  private readonly logger = new Logger(TimeoutPendingPaymentsScheduler.name);

  constructor(
    private readonly scheduler: SchedulerRegistry,
    private readonly payments: IPaymentsRepository,
  ) {}

  onModuleInit(): void {
    const cron = new CronJob(CRON_EVERY_30_SECONDS, () => {
      void this.run();
    });
    this.scheduler.addCronJob('timeout-pending-payments', cron);
    cron.start();
  }

  /** Exposed for tests and manual invocation. */
  async run(): Promise<void> {
    const cutoff = new Date(Date.now() - PENDING_TTL_MS);

    let pending;
    try {
      pending = await this.payments.findPendingOlderThan(cutoff);
    } catch (err) {
      this.logger.error('Failed to query pending payments for timeout', err);
      return;
    }

    if (pending.length === 0) return;

    this.logger.log(`Timing out ${pending.length} pending payment(s)`);

    for (const payment of pending) {
      try {
        await this.payments.setStatus(payment.id, 'timeout');
        this.logger.log(
          `Payment ${payment.id} timed out (transactionId: ${payment.transactionId})`,
        );
      } catch (err) {
        this.logger.error(`Failed to timeout payment ${payment.id}`, err);
      }
    }
  }
}
