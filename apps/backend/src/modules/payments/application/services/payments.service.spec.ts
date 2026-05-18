import { describe, expect, it, vi } from 'vitest';

import { makeBookingsRepositoryFake } from '../../../../../test/factories/bookings-repository.fake';
import {
  PaymentAmountMismatchError,
  PaymentBookingNotPendingError,
  PaymentNotFoundError,
  PaymentWebhookSignatureError,
} from '../../domain/errors';
import { IPaymentsRepository } from '../../domain/interfaces/payments.repository';
import { IPaymentProvider, VerifiedWebhook } from '../../domain/interfaces/payment-provider';
import { PaymentProviderRegistry } from '../../infrastructure/provider-registry';
import { PaymentsService } from './payments.service';
import { Payment } from '../../domain/entities/payment.entity';
import { ITicketsRepository } from '@/modules/tickets/domain/interfaces/tickets.repository';
import { ISeatLockService } from '@/modules/seat-lock/domain/interfaces/seat-lock.service';

// ── Fakes ─────────────────────────────────────────────────────────────────────

function makePaymentsRepoFake(): IPaymentsRepository {
  const store = new Map<number, Payment>();
  const byTxId = new Map<string, Payment>();
  let nextId = 1;

  return {
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findByTransactionId(txId) {
      return byTxId.get(txId) ?? null;
    },
    async listByBooking(bookingId) {
      return [...store.values()].filter((p) => p.bookingId === bookingId);
    },
    async findPendingOlderThan(date) {
      return [...store.values()].filter((p) => p.status === 'pending' && p.createdAt < date);
    },
    async create(input) {
      const id = nextId++;
      const p: Payment = {
        id,
        bookingId: input.bookingId,
        provider: input.provider,
        amount: input.amount,
        status: 'pending',
        transactionId: input.transactionId,
        rawPayload: input.rawPayload ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(id, p);
      byTxId.set(input.transactionId, p);
      return p;
    },
    async setStatus(id, status) {
      const p = store.get(id);
      if (p) {
        const updated = { ...p, status };
        store.set(id, updated);
        if (p.transactionId) byTxId.set(p.transactionId, updated);
      }
    },
    async setTransactionId(id, transactionId) {
      const p = store.get(id);
      if (p) {
        if (p.transactionId) byTxId.delete(p.transactionId);
        const updated = { ...p, transactionId };
        store.set(id, updated);
        byTxId.set(transactionId, updated);
      }
    },
  } satisfies IPaymentsRepository;
}

function makeTicketsRepoFake(): ITicketsRepository {
  return {
    async createMany(inputs) {
      return inputs.map((i, idx) => ({
        id: idx + 1,
        bookingSeatId: i.bookingSeatId,
        qrCode: i.qrCode,
        status: 'valid',
        checkInAt: null,
        createdAt: new Date(),
      }));
    },
    async findByBookingId() {
      return [];
    },
    async setStatus() {},
  } satisfies ITicketsRepository;
}

function makeSeatLockFake(): ISeatLockService {
  return {
    async tryLock() {
      return { ok: true };
    },
    async release() {},
    async lockedSeatIdsFor() {
      return [];
    },
  } satisfies ISeatLockService;
}

function makeStubProvider(
  name: 'momo' | 'stripe',
  webhook?: Partial<VerifiedWebhook>,
): IPaymentProvider {
  return {
    name,
    async createPayment(input) {
      return {
        transactionId: `${name}-${input.booking.bookingCode}-111`,
        paymentUrl: `https://pay.example.com/${name}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    },
    async verifyWebhook() {
      return {
        transactionId: `${name}-BOOK0001-111`,
        status: 'succeeded',
        amount: 200_000,
        bookingCode: 'BOOK0001',
        rawPayload: {},
        ...webhook,
      };
    },
  } as IPaymentProvider;
}

// Minimal DatabaseService stub — $transaction delegates to in-memory stores
// so tests can assert via the repo after confirmPayment runs.
function makeDbStub(paymentStatuses: Map<number, string>, bookingStatuses: Map<number, string>) {
  return {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        payment: {
          update: vi
            .fn()
            .mockImplementation(
              ({ where, data }: { where: { id: number }; data: { status: string } }) => {
                paymentStatuses.set(where.id, data.status);
                return Promise.resolve({});
              },
            ),
        },
        booking: {
          update: vi
            .fn()
            .mockImplementation(
              ({ where, data }: { where: { id: number }; data: { status: string } }) => {
                bookingStatuses.set(where.id, data.status);
                return Promise.resolve({});
              },
            ),
        },
        ticket: {
          createMany: vi.fn().mockResolvedValue({}),
        },
      };
      await fn(tx);
      return tx;
    },
  };
}

// ── Builder ───────────────────────────────────────────────────────────────────

function buildService(
  opts: {
    providerWebhook?: Partial<VerifiedWebhook>;
    provider?: 'momo' | 'stripe';
  } = {},
) {
  const bookingsRepo = makeBookingsRepositoryFake();
  const paymentsRepo = makePaymentsRepoFake();
  const ticketsRepo = makeTicketsRepoFake();
  const seatLock = makeSeatLockFake();
  const providerName = opts.provider ?? 'momo';
  const provider = makeStubProvider(providerName, opts.providerWebhook);
  const registry = new PaymentProviderRegistry([provider]);

  // Shared in-memory maps so db.$transaction updates are observable via repo queries
  const paymentStatuses = new Map<number, string>();
  const bookingStatuses = new Map<number, string>();
  const db = makeDbStub(paymentStatuses, bookingStatuses);

  const service = new PaymentsService(
    paymentsRepo,
    bookingsRepo,
    ticketsRepo,
    seatLock,
    registry,
    db as never,
  );

  return {
    service,
    bookingsRepo,
    paymentsRepo,
    ticketsRepo,
    seatLock,
    registry,
    paymentStatuses,
    bookingStatuses,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedBooking(
  bookingsRepo: ReturnType<typeof makeBookingsRepositoryFake>,
  overrides: {
    status?: string;
    totalAmount?: number;
  } = {},
) {
  return bookingsRepo
    .create({
      bookingCode: 'BOOK0001',
      userId: 1,
      tripId: 10,
      totalAmount: overrides.totalAmount ?? 200_000,
      couponId: null,
      seats: [{ seatId: 1, price: 200_000 }],
      passengers: [{ fullName: 'Alice', phone: '09011', idCardEncrypted: 'enc' }],
    })
    .then(async (b) => {
      if (overrides.status && overrides.status !== 'pending') {
        await bookingsRepo.setStatus(b.id, overrides.status as never);
      }
      return b;
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService.createForBooking', () => {
  it('creates a pending payment and returns paymentUrl', async () => {
    const { service, bookingsRepo, paymentsRepo } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const result = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    expect(result.payment.status).toBe('pending');
    expect(result.payment.bookingId).toBe(booking.id);
    expect(result.paymentUrl).toContain('pay.example.com');

    const stored = await paymentsRepo.findById(result.payment.id);
    expect(stored).not.toBeNull();
    expect(stored!.transactionId).toMatch(/^momo-BOOK0001-/);
  });

  it('throws PaymentBookingNotPendingError when booking is not pending', async () => {
    const { service, bookingsRepo } = buildService();
    const booking = await seedBooking(bookingsRepo, { status: 'expired' });

    await expect(
      service.createForBooking(booking.id, 'momo', 'http://return.url', { userId: 1 }),
    ).rejects.toBeInstanceOf(PaymentBookingNotPendingError);
  });

  it('throws PaymentNotFoundError when booking does not exist', async () => {
    const { service } = buildService();

    await expect(
      service.createForBooking(9999, 'momo', 'http://return.url', { userId: 1 }),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });
});

describe('PaymentsService.handleWebhook', () => {
  it('confirms payment and booking on succeeded webhook', async () => {
    const { service, bookingsRepo, paymentStatuses, bookingStatuses } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    await service.handleWebhook('momo', {}, JSON.stringify({}));

    // db.$transaction updated both records
    expect(paymentStatuses.get(payment.id)).toBe('succeeded');
    expect(bookingStatuses.get(booking.id)).toBe('paid');
  });

  it('is idempotent — second webhook hit on already-succeeded payment is a no-op', async () => {
    const { service, bookingsRepo, paymentsRepo, paymentStatuses } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    // First confirmation — mark succeeded in the paymentsRepo so idempotency check works
    await service.handleWebhook('momo', {}, JSON.stringify({}));
    // Simulate repo reflecting the succeeded state
    await paymentsRepo.setStatus(payment.id, 'succeeded');

    const callsBefore = paymentStatuses.size;

    // Second hit — must not throw and must not trigger a new $transaction
    await expect(service.handleWebhook('momo', {}, JSON.stringify({}))).resolves.toBeUndefined();
    // paymentStatuses should not have grown from new $transaction calls
    expect(paymentStatuses.size).toBe(callsBefore);
  });

  it('marks payment failed on failed webhook', async () => {
    const { service, bookingsRepo, paymentsRepo } = buildService({
      providerWebhook: { status: 'failed', transactionId: 'momo-BOOK0001-111' },
    });
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    await service.handleWebhook('momo', {}, JSON.stringify({}));

    // For failed status the service calls paymentsRepo.setStatus (not $transaction)
    const updated = await paymentsRepo.findById(payment.id);
    expect(updated!.status).toBe('failed');
  });

  it('throws PaymentAmountMismatchError when amounts do not match', async () => {
    const { service, bookingsRepo } = buildService({
      providerWebhook: {
        status: 'succeeded',
        transactionId: 'momo-BOOK0001-111',
        amount: 999, // wrong amount
      },
    });
    const booking = await seedBooking(bookingsRepo, { totalAmount: 200_000 });

    await service.createForBooking(booking.id, 'momo', 'http://return.url', { userId: 1 });

    await expect(service.handleWebhook('momo', {}, JSON.stringify({}))).rejects.toBeInstanceOf(
      PaymentAmountMismatchError,
    );
  });

  it('propagates PaymentWebhookSignatureError from provider', async () => {
    const bookingsRepo = makeBookingsRepositoryFake();
    const paymentsRepo = makePaymentsRepoFake();
    const ticketsRepo = makeTicketsRepoFake();
    const seatLock = makeSeatLockFake();

    const badProvider: IPaymentProvider = {
      name: 'momo',
      async createPayment(input) {
        return {
          transactionId: `momo-${input.booking.bookingCode}-111`,
          paymentUrl: 'https://pay.example.com/momo',
          expiresAt: new Date(Date.now() + 900_000),
        };
      },
      async verifyWebhook() {
        throw new PaymentWebhookSignatureError('bad sig');
      },
    } as IPaymentProvider;

    const registry = new PaymentProviderRegistry([badProvider]);
    const db = makeDbStub(new Map(), new Map());
    const service = new PaymentsService(
      paymentsRepo,
      bookingsRepo,
      ticketsRepo,
      seatLock,
      registry,
      db as never,
    );

    await expect(service.handleWebhook('momo', {}, 'body')).rejects.toBeInstanceOf(
      PaymentWebhookSignatureError,
    );
  });

  it('returns without error when transactionId is unknown (no payment found)', async () => {
    const { service } = buildService({
      providerWebhook: { transactionId: 'momo-UNKNOWN-000', bookingCode: 'UNKNOWN' },
    });

    // Should not throw — provider unknown transactionId is logged and ignored
    await expect(service.handleWebhook('momo', {}, JSON.stringify({}))).resolves.toBeUndefined();
  });
});

describe('PaymentsService.manualConfirm', () => {
  it('admin can force-confirm a pending payment', async () => {
    const { service, bookingsRepo, paymentStatuses } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    await service.manualConfirm(payment.id, 'manual-txn-001', { userId: 99, role: 'admin' });

    // db.$transaction ran and updated the payment to succeeded
    expect(paymentStatuses.get(payment.id)).toBe('succeeded');
  });

  it('manualConfirm is idempotent on already-succeeded payment', async () => {
    const { service, bookingsRepo, paymentsRepo, paymentStatuses } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    await service.manualConfirm(payment.id, 'manual-txn-001', { userId: 99, role: 'admin' });
    // Simulate repo reflecting succeeded so the idempotency guard triggers
    await paymentsRepo.setStatus(payment.id, 'succeeded');

    const callsBefore = paymentStatuses.size;
    await expect(
      service.manualConfirm(payment.id, 'manual-txn-001', { userId: 99, role: 'admin' }),
    ).resolves.toBeUndefined();

    // No new $transaction calls
    expect(paymentStatuses.size).toBe(callsBefore);
  });

  it('throws when actor is not admin', async () => {
    const { service, bookingsRepo } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    await expect(
      service.manualConfirm(payment.id, 'txn-x', { userId: 1, role: 'customer' }),
    ).rejects.toThrow('Only admins can manually confirm payments');
  });

  it('throws PaymentNotFoundError for unknown paymentId', async () => {
    const { service } = buildService();

    await expect(
      service.manualConfirm(9999, 'txn-x', { userId: 99, role: 'admin' }),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);
  });
});

describe('PaymentsService.findById', () => {
  it('returns payment when found', async () => {
    const { service, bookingsRepo } = buildService();
    const booking = await seedBooking(bookingsRepo);

    const { payment } = await service.createForBooking(booking.id, 'momo', 'http://return.url', {
      userId: 1,
    });

    const found = await service.findById(payment.id, { userId: 1 });
    expect(found.id).toBe(payment.id);
  });

  it('throws PaymentNotFoundError when not found', async () => {
    const { service } = buildService();
    await expect(service.findById(9999, { userId: 1 })).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });
});
