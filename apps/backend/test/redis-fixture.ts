import Redis from 'ioredis';

import { IRedisClient } from '@/modules/redis/redis.client';

export interface RedisFixture {
  client: IRedisClient;
  connectionString: string;
  flushAll: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Concrete ioredis adapter used only in tests — mirrors RedisClientImpl in
 * redis.module.ts but lives here so tests don't depend on the module factory.
 */
class TestRedisClient extends IRedisClient {
  constructor(private readonly redis: Redis) {
    super();
  }

  ping(): Promise<string> {
    return this.redis.ping();
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.redis.eval(script, keys.length, ...keys, ...args);
  }

  async del(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.redis.del(...keys);
  }

  async exists(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.redis.exists(...keys);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }
}

/**
 * Opens an ioredis client against the shared testcontainer Redis booted in
 * `globalSetup`. No new container per spec — `REDIS_URL` is set by
 * global-setup.ts before any spec file evaluates.
 *
 * Returns a fixture with the client + a `flushAll` helper for beforeEach
 * isolation between specs.
 */
export async function startRedisFixture(): Promise<RedisFixture> {
  const connectionString = process.env.REDIS_URL;
  if (!connectionString) {
    throw new Error('REDIS_URL is not set — did vitest globalSetup (test/global-setup.ts) run?');
  }

  const ioredis = new Redis(connectionString, { lazyConnect: false, enableReadyCheck: false });
  const client = new TestRedisClient(ioredis);

  return {
    client,
    connectionString,
    flushAll: async () => {
      await ioredis.flushall();
    },
    stop: async () => {
      ioredis.disconnect();
    },
  };
}
