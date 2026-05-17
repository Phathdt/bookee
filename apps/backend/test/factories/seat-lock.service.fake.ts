import {
  ISeatLockService,
  SeatLockResult,
} from '@/modules/seat-lock/domain/interfaces/seat-lock.service';

/**
 * In-memory ISeatLockService for unit tests.
 * Stores locks as `tripId:seatId` → bookingId.
 */
export function makeSeatLockServiceFake(): ISeatLockService {
  // key: `${tripId}:${seatId}` → bookingId
  const locks = new Map<string, string>();

  function lockKey(tripId: number, seatId: number): string {
    return `${tripId}:${seatId}`;
  }

  return {
    async tryLock(
      tripId: number,
      seatIds: number[],
      bookingId: string,
      _ttlSeconds: number,
    ): Promise<SeatLockResult> {
      const conflicting: number[] = [];
      for (const seatId of seatIds) {
        const existing = locks.get(lockKey(tripId, seatId));
        if (existing && existing !== bookingId) {
          conflicting.push(seatId);
        }
      }
      if (conflicting.length > 0) {
        return { ok: false, conflictingSeatIds: conflicting };
      }
      for (const seatId of seatIds) {
        locks.set(lockKey(tripId, seatId), bookingId);
      }
      return { ok: true };
    },

    async release(tripId: number, seatIds: number[], bookingId: string): Promise<void> {
      for (const seatId of seatIds) {
        const key = lockKey(tripId, seatId);
        if (locks.get(key) === bookingId) {
          locks.delete(key);
        }
      }
    },

    async lockedSeatIdsFor(tripId: number): Promise<number[]> {
      const prefix = `${tripId}:`;
      const result: number[] = [];
      for (const key of locks.keys()) {
        if (key.startsWith(prefix)) {
          result.push(parseInt(key.slice(prefix.length), 10));
        }
      }
      return result;
    },
  } satisfies ISeatLockService;
}
