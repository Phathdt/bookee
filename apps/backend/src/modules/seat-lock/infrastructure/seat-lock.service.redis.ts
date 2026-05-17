import { IRedisClient } from '@/modules/redis/redis.client';

import { ISeatLockService, SeatLockResult } from '../domain/interfaces/seat-lock.service';

/**
 * Lua script — atomic multi-seat acquire.
 *
 * KEYS  = seat-lock keys: one per seatId
 * ARGV[1] = bookingId (lock value)
 * ARGV[2] = ttl in seconds
 *
 * Returns: array where first element is 1 (success) or 0 (failure).
 * On failure, remaining elements are the conflicting key names.
 * ALL-OR-NOTHING: if any seat is taken, no locks are acquired.
 */
const LUA_TRY_LOCK = `
local conflicts = {}
for i = 1, #KEYS do
  local val = redis.call('GET', KEYS[i])
  if val ~= false and val ~= ARGV[1] then
    table.insert(conflicts, KEYS[i])
  end
end
if #conflicts > 0 then
  local result = {0}
  for _, k in ipairs(conflicts) do
    table.insert(result, k)
  end
  return result
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', tonumber(ARGV[2]))
end
return {1}
`;

/**
 * Lua script — conditional release.
 *
 * KEYS  = seat-lock keys to release
 * ARGV[1] = bookingId that owns the lock
 *
 * Deletes a key only when its current value matches bookingId.
 * Returns number of keys deleted.
 */
const LUA_RELEASE = `
local deleted = 0
for i = 1, #KEYS do
  local val = redis.call('GET', KEYS[i])
  if val == ARGV[1] then
    redis.call('DEL', KEYS[i])
    deleted = deleted + 1
  end
end
return deleted
`;

function seatKey(tripId: number, seatId: number): string {
  return `seat-lock:${tripId}:${seatId}`;
}

function extractSeatId(tripId: number, key: string): number {
  const prefix = `seat-lock:${tripId}:`;
  return parseInt(key.slice(prefix.length), 10);
}

export class SeatLockServiceRedis extends ISeatLockService {
  constructor(private readonly redis: IRedisClient) {
    super();
  }

  async tryLock(
    tripId: number,
    seatIds: number[],
    bookingId: string,
    ttlSeconds: number,
  ): Promise<SeatLockResult> {
    if (seatIds.length === 0) return { ok: true };

    const keys = seatIds.map((id) => seatKey(tripId, id));
    const result = (await this.redis.eval(LUA_TRY_LOCK, keys, [bookingId, String(ttlSeconds)])) as (
      | string
      | number
    )[];

    const success = Number(result[0]) === 1;
    if (success) return { ok: true };

    // Extract conflicting seat IDs from the returned key names
    const conflictingKeys = result.slice(1) as string[];
    const conflictingSeatIds = conflictingKeys.map((k) => extractSeatId(tripId, k));
    return { ok: false, conflictingSeatIds };
  }

  async release(tripId: number, seatIds: number[], bookingId: string): Promise<void> {
    if (seatIds.length === 0) return;
    const keys = seatIds.map((id) => seatKey(tripId, id));
    await this.redis.eval(LUA_RELEASE, keys, [bookingId]);
  }

  async lockedSeatIdsFor(tripId: number): Promise<number[]> {
    // We use a scan pattern approach — iterate keys matching seat-lock:{tripId}:*
    // ioredis scan is not in IRedisClient; use a raw eval to avoid exposing scan.
    // This is acceptable because lockedSeatIdsFor is a best-effort read for
    // availableSeats display (not a security boundary).
    const LUA_SCAN = `
local cursor = "0"
local pattern = ARGV[1]
local results = {}
repeat
  local res = redis.call("SCAN", cursor, "MATCH", pattern, "COUNT", 100)
  cursor = res[1]
  for _, k in ipairs(res[2]) do
    table.insert(results, k)
  end
until cursor == "0"
return results
`;
    const pattern = `seat-lock:${tripId}:*`;
    const keys = (await this.redis.eval(LUA_SCAN, [], [pattern])) as string[];
    return keys.map((k) => extractSeatId(tripId, k));
  }
}
