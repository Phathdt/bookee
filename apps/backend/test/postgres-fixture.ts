import { execSync } from 'node:child_process';
import * as path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { PrismaClient } from '@/generated/prisma/client';
import { DatabaseService } from '@/modules/database/database.service';

/**
 * Boot a disposable Postgres container, run prisma migrate deploy against
 * it, and hand back a Prisma client wired to that DSN.
 *
 * Used by *.integration.spec.ts files. Container is global per test file
 * (created in beforeAll, torn down in afterAll).
 */
export interface PostgresFixture {
  prisma: PrismaClient;
  databaseService: DatabaseService;
  connectionString: string;
  /**
   * Wipes every table in dependency-friendly order. Use this in `beforeEach`
   * so tests inherit a clean DB regardless of what previous files left over.
   * Keep this list updated as new models are added.
   */
  resetDatabase: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function startPostgresFixture(): Promise<PostgresFixture> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('bookee_test')
    .withUsername('bookee')
    .withPassword('bookee')
    .withReuse()
    .start();

  const connectionString = container.getConnectionUri();

  // Apply the committed migrations. `migrate deploy` is the production-style
  // command — no schema-diff prompts, just runs every migration_lock-tracked
  // file in order. Fast against a fresh container.
  execSync('bunx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'pipe',
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // Cast as DatabaseService — they share the same delegate surface, and
  // tests only need the user/booking/etc. accessors anyway.
  const databaseService = prisma as unknown as DatabaseService;

  // Child → parent order: anything referencing another table goes first.
  // Soft relations (relationMode = "prisma") mean Postgres won't cascade,
  // so we must do it manually.
  async function resetDatabase(): Promise<void> {
    await prisma.bookingSeat.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.passenger.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.seat.deleteMany({});
    await prisma.seatLayout.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.station.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.busCompany.deleteMany({});
  }

  return {
    prisma,
    databaseService,
    connectionString,
    resetDatabase,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}
