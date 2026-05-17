import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { RedisFixture, startRedisFixture } from '../../../../test/redis-fixture';
import { SeatLockServiceRedis } from './seat-lock.service.redis';

describe('SeatLockServiceRedis (integration)', () => {
  let fx: RedisFixture;
  let svc: SeatLockServiceRedis;
  const TRIP_A = 101;

  beforeAll(async () => {
    fx = await startRedisFixture();
    svc = new SeatLockServiceRedis(fx.client);
  }, 60_000);

  afterAll(async () => {
    await fx.stop();
  });

  afterEach(async () => {
    await fx.flushAll();
  });

  // ── Basic lock / unlock ──────────────────────────────────────────────────

  it('acquires a lock on seats that are free', async () => {
    const result = await svc.tryLock(TRIP_A, [1, 2, 3], 'booking-X', 600);
    expect(result.ok).toBe(true);
    expect(result.conflictingSeatIds).toBeUndefined();
  });

  it('rejects when any seat is already locked by another booking', async () => {
    await svc.tryLock(TRIP_A, [1, 2, 3], 'booking-X', 600);

    // Seat 3 is taken by booking-X; booking-Y wants [3, 4]
    const result = await svc.tryLock(TRIP_A, [3, 4], 'booking-Y', 600);
    expect(result.ok).toBe(false);
    expect(result.conflictingSeatIds).toContain(3);
    expect(result.conflictingSeatIds).not.toContain(4);
  });

  it('does NOT acquire any seat when the operation fails (all-or-nothing)', async () => {
    await svc.tryLock(TRIP_A, [1], 'booking-X', 600);

    // booking-Y wants [1, 2] — seat 1 conflicts
    const result = await svc.tryLock(TRIP_A, [1, 2], 'booking-Y', 600);
    expect(result.ok).toBe(false);

    // seat 2 should NOT be locked (no partial state)
    const lockAfter = await svc.tryLock(TRIP_A, [2], 'booking-Z', 600);
    expect(lockAfter.ok).toBe(true);
  });

  // ── Release ──────────────────────────────────────────────────────────────

  it('releases seats when bookingId matches', async () => {
    await svc.tryLock(TRIP_A, [1, 2, 3], 'booking-X', 600);
    await svc.release(TRIP_A, [1, 2, 3], 'booking-X');

    // All seats should now be available
    const result = await svc.tryLock(TRIP_A, [1, 2, 3], 'booking-Y', 600);
    expect(result.ok).toBe(true);
  });

  it('does NOT release locks belonging to a different booking', async () => {
    await svc.tryLock(TRIP_A, [1, 2, 3], 'booking-X', 600);

    // Attempt release with wrong bookingId
    await svc.release(TRIP_A, [1, 2, 3], 'booking-INTRUDER');

    // Seats should still be locked by booking-X
    const result = await svc.tryLock(TRIP_A, [1], 'booking-Y', 600);
    expect(result.ok).toBe(false);
  });

  // ── TTL expiry ────────────────────────────────────────────────────────────

  it('seat becomes lockable again after TTL expires', async () => {
    await svc.tryLock(TRIP_A, [99], 'booking-X', 1); // 1s TTL

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 1500));

    const result = await svc.tryLock(TRIP_A, [99], 'booking-Y', 600);
    expect(result.ok).toBe(true);
  }, 10_000);

  // ── lockedSeatIdsFor ──────────────────────────────────────────────────────

  it('returns locked seat IDs for a trip', async () => {
    await svc.tryLock(TRIP_A, [10, 20, 30], 'booking-X', 600);
    const locked = await svc.lockedSeatIdsFor(TRIP_A);
    expect(locked.sort((a, b) => a - b)).toEqual([10, 20, 30]);
  });

  it('returns empty array when no seats are locked', async () => {
    const locked = await svc.lockedSeatIdsFor(TRIP_A);
    expect(locked).toEqual([]);
  });

  // ── Concurrency (9.10) ────────────────────────────────────────────────────

  it('exactly one winner when two requests race for the same seat', async () => {
    const results = await Promise.all([
      svc.tryLock(TRIP_A, [5, 6], 'booking-ALPHA', 600),
      svc.tryLock(TRIP_A, [5, 7], 'booking-BETA', 600),
    ]);

    const winners = results.filter((r) => r.ok);
    const losers = results.filter((r) => !r.ok);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]?.conflictingSeatIds).toBeDefined();
    expect(losers[0]?.conflictingSeatIds?.length).toBeGreaterThan(0);
  });

  it('concurrent requests on non-overlapping seats both succeed', async () => {
    const results = await Promise.all([
      svc.tryLock(TRIP_A, [11, 12], 'booking-ALPHA', 600),
      svc.tryLock(TRIP_A, [13, 14], 'booking-BETA', 600),
    ]);

    expect(results[0]?.ok).toBe(true);
    expect(results[1]?.ok).toBe(true);
  });
});
