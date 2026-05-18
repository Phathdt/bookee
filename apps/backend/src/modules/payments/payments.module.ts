import { Module } from '@nestjs/common';

import { BookingsModule } from '@/modules/bookings/bookings.module';
import { IBookingsRepository } from '@/modules/bookings/domain/interfaces/bookings.repository';
import { DatabaseService } from '@/modules/database/database.service';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';
import { SeatLockModule } from '@/modules/seat-lock/seat-lock.module';
import { ITicketsRepository } from '@/modules/tickets/domain/interfaces/tickets.repository';
import { TicketsModule } from '@/modules/tickets/tickets.module';

import { PaymentsService } from './application/services/payments.service';
import { IPaymentsService } from './domain/interfaces/payments.service';
import { IPaymentsRepository } from './domain/interfaces/payments.repository';
import { MomoProvider } from './infrastructure/providers/momo.provider';
import { StripeProvider } from './infrastructure/providers/stripe.provider';
import { PaymentProviderRegistry } from './infrastructure/provider-registry';
import { PaymentsRepositoryPrisma } from './infrastructure/repositories/payments.repository.prisma';

const MOMO_PROVIDER = 'MOMO_PROVIDER';
const STRIPE_PROVIDER = 'STRIPE_PROVIDER';

@Module({
  imports: [BookingsModule, SeatLockModule, TicketsModule],
  providers: [
    {
      provide: IPaymentsRepository,
      useFactory: (db: DatabaseService) => new PaymentsRepositoryPrisma(db),
      inject: [DatabaseService],
    },
    {
      provide: MOMO_PROVIDER,
      useFactory: () =>
        new MomoProvider({
          partnerCode: process.env.MOMO_PARTNER_CODE ?? 'MOMO_TEST',
          accessKey: process.env.MOMO_ACCESS_KEY ?? 'MOMO_TEST_ACCESS',
          secretKey: process.env.MOMO_SECRET_KEY ?? '',
          apiBase: process.env.MOMO_API_BASE ?? 'https://test-payment.momo.vn',
          returnUrl: process.env.MOMO_RETURN_URL ?? 'http://localhost:5174/payment/return',
          notifyUrl:
            process.env.MOMO_NOTIFY_URL ?? 'http://localhost:3000/api/v1/payments/webhooks/momo',
        }),
    },
    {
      provide: STRIPE_PROVIDER,
      useFactory: () =>
        new StripeProvider({
          apiKey: process.env.STRIPE_API_KEY ?? 'sk_test_DEFER',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_DEFER',
        }),
    },
    {
      provide: PaymentProviderRegistry,
      useFactory: (momo: MomoProvider, stripe: StripeProvider) =>
        new PaymentProviderRegistry([momo, stripe]),
      inject: [MOMO_PROVIDER, STRIPE_PROVIDER],
    },
    {
      provide: IPaymentsService,
      useFactory: (
        paymentsRepo: IPaymentsRepository,
        bookingsRepo: IBookingsRepository,
        ticketsRepo: ITicketsRepository,
        seatLock: ISeatLockService,
        registry: PaymentProviderRegistry,
        db: DatabaseService,
      ) => new PaymentsService(paymentsRepo, bookingsRepo, ticketsRepo, seatLock, registry, db),
      inject: [
        IPaymentsRepository,
        IBookingsRepository,
        ITicketsRepository,
        ISeatLockService,
        PaymentProviderRegistry,
        DatabaseService,
      ],
    },
  ],
  exports: [IPaymentsService, IPaymentsRepository, PaymentProviderRegistry],
})
export class PaymentsModule {}
