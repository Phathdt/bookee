import { SchedulerRegistry } from '@nestjs/schedule';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeBookingsRepositoryFake } from '../../test/factories/bookings-repository.fake';
import { makeSeatLockServiceFake } from '../../test/factories/seat-lock.service.fake';
import { ExpirePendingBookingsScheduler } from './expire-pending-bookings.scheduler';

describe('ExpirePendingBookingsScheduler', () => {
  let fakeRepo: ReturnType<typeof makeBookingsRepositoryFake>;
  let fakeLock: ReturnType<typeof makeSeatLockServiceFake>;
  let scheduler: ExpirePendingBookingsScheduler;

  beforeEach(() => {
    fakeRepo = makeBookingsRepositoryFake();
    fakeLock = makeSeatLockServiceFake();
    scheduler = new ExpirePendingBookingsScheduler(new SchedulerRegistry(), fakeRepo, fakeLock);
  });

  it('expires pending bookings older than 10 minutes', async () => {
    const old = new Date(Date.now() - 11 * 60 * 1000);
    await fakeRepo.create({
      bookingCode: 'ABCD1234',
      userId: 1,
      tripId: 10,
      totalAmount: 100,
      couponId: null,
      seats: [{ seatId: 1, price: 100 }],
      passengers: [{ fullName: 'Alice', phone: '0900000001', idCardEncrypted: 'enc:xx:yy' }],
    });

    fakeRepo._backdateAll(old);

    await scheduler.run();

    const updated = await fakeRepo.findByCode('ABCD1234');
    expect(updated?.status).toBe('expired');
  });

  it('does NOT expire pending bookings created within 10 minutes', async () => {
    await fakeRepo.create({
      bookingCode: 'NEWCODE1',
      userId: 1,
      tripId: 10,
      totalAmount: 100,
      couponId: null,
      seats: [{ seatId: 2, price: 100 }],
      passengers: [{ fullName: 'Bob', phone: '0900000002', idCardEncrypted: 'enc:xx:zz' }],
    });

    await scheduler.run();

    const booking = await fakeRepo.findByCode('NEWCODE1');
    expect(booking?.status).toBe('pending');
  });

  it('releases seat locks when expiring a booking', async () => {
    const old = new Date(Date.now() - 11 * 60 * 1000);
    await fakeRepo.create({
      bookingCode: 'EXPLOCK1',
      userId: 1,
      tripId: 20,
      totalAmount: 200,
      couponId: null,
      seats: [{ seatId: 5, price: 200 }],
      passengers: [{ fullName: 'Carol', phone: '0900000003', idCardEncrypted: 'enc:aa:bb' }],
    });
    fakeRepo._backdateAll(old);

    await fakeLock.tryLock(20, [5], 'EXPLOCK1', 600);

    await scheduler.run();

    const lockResult = await fakeLock.tryLock(20, [5], 'ANOTHER', 600);
    expect(lockResult.ok).toBe(true);
  });

  it('does nothing when no pending bookings exist', async () => {
    const releaseSpy = vi.spyOn(fakeLock, 'release');
    await scheduler.run();
    expect(releaseSpy).not.toHaveBeenCalled();
  });
});
