import { Global, Module } from '@nestjs/common';

import { DATABASE_CONNECTION_STRING } from './database.constants';
import { DatabaseService } from './database.service';

/**
 * Global database module — every feature module gets DatabaseService via DI
 * without needing to import this module explicitly.
 *
 * Connection string is sourced from process.env.DATABASE_URL at boot. Wrap
 * with ConfigModule.forRoot() later if we need stricter env validation.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION_STRING,
      useFactory: (): string => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          throw new Error('DATABASE_URL is required. Copy .env.example to .env and fill it in.');
        }
        return url;
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
