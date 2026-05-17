import { execSync } from 'node:child_process';
import * as path from 'node:path';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Vitest globalSetup — runs ONCE before the integration suite. Spins up a
 * shared testcontainers Postgres, applies migrations, and exposes the DSN
 * via process.env.TEST_DATABASE_URL so every spec's startPostgresFixture()
 * can reuse it without re-running migrate deploy (which used to add ~25s
 * across 14 files).
 */

let container: StartedPostgreSqlContainer | undefined;

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('bookee_test')
    .withUsername('bookee')
    .withPassword('bookee')
    .withReuse()
    .start();

  const url = container.getConnectionUri();
  process.env.TEST_DATABASE_URL = url;
  // Lower bcrypt cost for tests — 4 is ~5ms vs 12's ~250ms. Hashing dominates
  // beforeEach in controller specs because they POST /auth/register.
  process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '4';

  execSync('bunx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}

export async function teardown(): Promise<void> {
  // Container started with .withReuse() — leaving it running between local
  // dev runs is intentional (huge speedup on re-run). CI tears it down via
  // the runner's cleanup, not here.
}
