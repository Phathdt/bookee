import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './controllers/auth/auth.controller';
import { HealthController } from './controllers/health/health.controller';
import { OperatorsController } from './controllers/operators/operators.controller';
import { RoutesController } from './controllers/routes/routes.controller';
import { SeatLayoutsController } from './controllers/seat-layouts/seat-layouts.controller';
import { StationsController } from './controllers/stations/stations.controller';
import { UsersController } from './controllers/users/users.controller';
import { TripsController } from './controllers/trips/trips.controller';
import { VehiclesController } from './controllers/vehicles/vehicles.controller';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { LoggerModule } from './modules/logger/logger.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SeatLayoutsModule } from './modules/seat-layouts/seat-layouts.module';
import { StationsModule } from './modules/stations/stations.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

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
    OperatorsModule,
    SeatLayoutsModule,
    StationsModule,
    RoutesModule,
    TripsModule,
    VehiclesModule,
    // Global throttler defaults; per-route overrides via @Throttle().
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    OperatorsController,
    SeatLayoutsController,
    StationsController,
    RoutesController,
    TripsController,
    VehiclesController,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
