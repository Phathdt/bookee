import { SchedulerRegistry } from '@nestjs/schedule';
import { describe, expect, it, vi } from 'vitest';

import { Payment } from '@/modules/payments/domain/entities/payment.entity';
import { IPaymentsRepository } from '@/modules/payments/domain/interfaces/payments.repository';

import { TimeoutPendingPaymentsScheduler } from './timeout-pending-payments.scheduler';

function makePaymentsRepoFake(pending: Payment[]): IPaymentsRepository {
  const store = new Map<number, Payment>(pending.map((p) => [p.id, p]));
  return {
    async findPendingOlderThan() {
      return pending;
    },
    async setStatus(id, status) {
      const p = store.get(id);
      if (p) store.set(id, { ...p, status });
    },
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findByTransactionId() {
      return null;
    },
    async listByBooking() {
      return [];
    },
    async create(input) {
      const p: Payment = {
        id: 1,
        bookingId: input.bookingId,
        provider: input.provider,
        amount: input.amount,
        status: 'pending',
        transactionId: input.transactionId,
        rawPayload: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(1, p);
      return p;
    },
    async setTransactionId() {},
  } satisfies IPaymentsRepository;
}

function makeStubPayment(id: number, overrides: Partial<Payment> = {}): Payment {
  return {
    id,
    bookingId: 10,
    provider: 'momo',
    amount: 200_000,
    status: 'pending',
    transactionId: `momo-BOOK-${id}`,
    rawPayload: null,
    createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min old
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSchedulerStub(): SchedulerRegistry {
  return {
    addCronJob: vi.fn(),
  } as unknown as SchedulerRegistry;
}

describe('TimeoutPendingPaymentsScheduler', () => {
  it('sets status to timeout for pending payments older than cutoff', async () => {
    const payment = makeStubPayment(1);
    const setStatus = vi.fn().mockResolvedValue(undefined);
    const repo = makePaymentsRepoFake([payment]);
    repo.setStatus = setStatus;

    const scheduler = new TimeoutPendingPaymentsScheduler(makeSchedulerStub(), repo);
    await scheduler.run();

    expect(setStatus).toHaveBeenCalledOnce();
    expect(setStatus).toHaveBeenCalledWith(payment.id, 'timeout');
  });

  it('does nothing when no pending payments are older than cutoff', async () => {
    const setStatus = vi.fn();
    const repo = makePaymentsRepoFake([]);
    repo.setStatus = setStatus;

    const scheduler = new TimeoutPendingPaymentsScheduler(makeSchedulerStub(), repo);
    await scheduler.run();

    expect(setStatus).not.toHaveBeenCalled();
  });

  it('continues processing other payments when one setStatus fails', async () => {
    const p1 = makeStubPayment(1);
    const p2 = makeStubPayment(2);
    const setStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);

    const repo = makePaymentsRepoFake([p1, p2]);
    repo.setStatus = setStatus;

    const scheduler = new TimeoutPendingPaymentsScheduler(makeSchedulerStub(), repo);
    // Should not throw even when one fails
    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(setStatus).toHaveBeenCalledTimes(2);
  });

  it('onModuleInit registers cron job with SchedulerRegistry', () => {
    const addCronJob = vi.fn();
    const schedulerRegistry = { addCronJob } as unknown as SchedulerRegistry;
    const repo = makePaymentsRepoFake([]);

    const scheduler = new TimeoutPendingPaymentsScheduler(schedulerRegistry, repo);
    scheduler.onModuleInit();

    expect(addCronJob).toHaveBeenCalledWith('timeout-pending-payments', expect.anything());
  });
});
