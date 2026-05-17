export interface SeatLockResult {
  ok: boolean;
  conflictingSeatIds?: number[];
}

/**
 * Distributed seat-lock contract.
 * Concrete implementation uses Redis Lua scripts for atomicity.
 */
export abstract class ISeatLockService {
  /**
   * Atomically attempt to lock ALL seatIds for a trip.
   * If any seat is already locked by another booking, the entire operation
   * is rejected (no partial state) and conflictingSeatIds are returned.
   */
  abstract tryLock(
    tripId: number,
    seatIds: number[],
    bookingId: string,
    ttlSeconds: number,
  ): Promise<SeatLockResult>;

  /**
   * Release locks for the given seats — only when the stored value matches
   * bookingId. Does not release seats locked by a different booking.
   */
  abstract release(tripId: number, seatIds: number[], bookingId: string): Promise<void>;

  /**
   * Returns the seat IDs currently locked for a trip (any booking).
   * Used by Trip Search to compute availableSeats.
   */
  abstract lockedSeatIdsFor(tripId: number): Promise<number[]>;
}
