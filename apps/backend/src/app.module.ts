import { Module } from '@nestjs/common';

import { HealthController } from './controllers/health/health.controller';
import { DatabaseModule } from './modules/database/database.module';
import { LoggerModule } from './modules/logger/logger.module';

/**
 * Root composition module.
 *
 * Convention:
 * - `controllers/` — HTTP layer (Nest @Controller classes + their DTOs)
 * - `modules/`     — business logic / cross-cutting (services, providers,
 *                    no controllers)
 *
 * Controllers are registered directly here; logic modules are imported.
 */
@Module({
  imports: [LoggerModule, DatabaseModule],
  controllers: [HealthController],
})
export class AppModule {}
