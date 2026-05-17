import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';
import { DatabaseService } from '@/modules/database/database.service';

/**
 * Per-spec Postgres handle. The shared container + schema migration are
 * provisioned once by test/global-setup.ts; this helper just opens a
 * Prisma client against TEST_DATABASE_URL and provides the cleanup helper.
 *
 * Used by *.integration.spec.ts files in beforeAll / beforeEach.
 */
export interface PostgresFixture {
  prisma: PrismaClient;
  databaseService: DatabaseService;
  connectionString: string;
  /**
   * Wipes every table via a single TRUNCATE ... CASCADE. Cheap enough to
   * call in beforeEach. RESTART IDENTITY keeps autoincrement IDs predictable
   * across tests.
   */
  resetDatabase: () => Promise<void>;
  stop: () => Promise<void>;
}

// Tables to wipe between tests. Names mirror @@map in prisma/schema.prisma.
// Order doesn't matter because TRUNCATE CASCADE handles dependencies; we list
// them so newly added models surface as a merge-conflict prompt to update
// this fixture.
const TABLES = [
  'booking_seats',
  'tickets',
  'payments',
  'passengers',
  'bookings',
  'trips',
  'vehicles',
  'seats',
  'seat_layouts',
  'routes',
  'stations',
  'coupons',
  'users',
  'bus_companies',
];

const truncateSql = `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`;

export async function startPostgresFixture(): Promise<PostgresFixture> {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'TEST_DATABASE_URL is not set — ensure vitest.integration.config.ts wires test/global-setup.ts.',
    );
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const databaseService = prisma as unknown as DatabaseService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(truncateSql);
  }

  return {
    prisma,
    databaseService,
    connectionString,
    resetDatabase,
    stop: async () => {
      await prisma.$disconnect();
    },
  };
}
