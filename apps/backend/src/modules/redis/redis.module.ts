import { Module } from '@nestjs/common';
import Redis from 'ioredis';

import { IRedisClient } from './redis.client';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Concrete ioredis adapter that satisfies IRedisClient.
 * Instantiated via useFactory so the token can be mocked in tests.
 */
class RedisClientImpl extends IRedisClient {
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

@Module({
  providers: [
    {
      provide: IRedisClient,
      useFactory: (): IRedisClient => {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const ioredis = new Redis(url, { lazyConnect: false, enableReadyCheck: false });
        return new RedisClientImpl(ioredis);
      },
    },
  ],
  exports: [IRedisClient],
})
export class RedisModule {}
