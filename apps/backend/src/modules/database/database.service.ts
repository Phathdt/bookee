import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { DATABASE_CONNECTION_STRING } from './database.constants';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * Thin NestJS wrapper around Prisma's generated client.
 *
 * Construction is driven by a connection string injected via DI so the same
 * service can be reused with different DSNs in integration tests. The pg
 * driver-adapter is wired here (Prisma 7 dropped inline datasource URLs).
 *
 * Lifecycle hooks defer the network handshake until the Nest container has
 * fully bootstrapped, and cleanly close the pool on shutdown so SIGTERM in
 * containers doesn't leak connections.
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DATABASE_CONNECTION_STRING) connectionString: string) {
    super({
      adapter: new PrismaPg({ connectionString }),
      log: [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.EXPORT_OPENAPI === '1') {
      // Skip DB connect during openapi:export CLI bootstrap.
      return;
    }
    await this.$connect();
    this.logger.log('Prisma client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
