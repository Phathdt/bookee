import { Module } from '@nestjs/common';

import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { LoggerModule } from './modules/logger/logger.module';

@Module({
  imports: [LoggerModule, DatabaseModule, HealthModule],
})
export class AppModule {}
