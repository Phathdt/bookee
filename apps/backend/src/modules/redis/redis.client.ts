/**
 * Abstract Redis client contract. The concrete implementation wraps ioredis.
 * Keeping the abstraction here means tests can substitute a fake without
 * touching ioredis internals.
 */
export abstract class IRedisClient {
  abstract ping(): Promise<string>;
  abstract eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  abstract del(keys: string[]): Promise<number>;
  abstract exists(keys: string[]): Promise<number>;
  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
  abstract get(key: string): Promise<string | null>;
  abstract disconnect(): Promise<void>;
}
