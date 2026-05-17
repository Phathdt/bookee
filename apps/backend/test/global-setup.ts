import { execSync } from 'node:child_process';
import * as path from 'node:path';

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

/**
 * Vitest globalSetup — runs ONCE before the integration suite. Spins up a
 * shared testcontainers Postgres, applies migrations, and exposes the DSN
 * via process.env.TEST_DATABASE_URL so every spec's startPostgresFixture()
 * can reuse it without re-running migrate deploy (which used to add ~25s
 * across 14 files).
 */

let pgContainer: StartedPostgreSqlContainer | undefined;
let redisContainer: StartedRedisContainer | undefined;

export async function setup(): Promise<void> {
  // Start Postgres + Redis in parallel — independent fixtures.
  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('bookee_test')
      .withUsername('bookee')
      .withPassword('bookee')
      .withReuse()
      .start(),
    new RedisContainer('redis:8-alpine').withReuse().start(),
  ]);

  const url = pgContainer.getConnectionUri();
  process.env.TEST_DATABASE_URL = url;
  // RedisModule reads process.env.REDIS_URL on AppModule boot — point it at
  // the testcontainer so specs don't pollute the local dev Redis (or fail
  // when docker-compose isn't running).
  process.env.REDIS_URL = redisContainer.getConnectionUrl();
  // Lower bcrypt cost for tests — 4 is ~5ms vs 12's ~250ms. Hashing dominates
  // beforeEach in controller specs because they POST /auth/register.
  process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '4';
  // Deterministic AES-256 key for integration suite. Production loads from
  // secret manager via the env.
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ??
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  execSync('bunx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}

// Re-export so fixtures can reference the running Redis container without
// re-instantiating it per spec.
export function getRedisUrl(): string {
  if (!redisContainer) throw new Error('Redis testcontainer not initialised');
  return redisContainer.getConnectionUrl();
}

export async function teardown(): Promise<void> {
  // Container started with .withReuse() — leaving it running between local
  // dev runs is intentional (huge speedup on re-run). CI tears it down via
  // the runner's cleanup, not here.
}
