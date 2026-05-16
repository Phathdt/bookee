import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './controllers/auth/auth.controller';
import { HealthController } from './controllers/health/health.controller';
import { UsersController } from './controllers/users/users.controller';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { LoggerModule } from './modules/logger/logger.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Root composition module.
 *
 * Convention:
 * - `controllers/` — HTTP layer (Nest @Controller + DTOs)
 * - `modules/`     — business logic / cross-cutting (services, providers,
 *                    no controllers)
 *
 * Controllers are registered directly here; logic modules are imported.
 */
@Module({
  imports: [
    LoggerModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    // Global throttler defaults; per-route overrides via @Throttle().
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
  ],
  controllers: [HealthController, AuthController, UsersController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
