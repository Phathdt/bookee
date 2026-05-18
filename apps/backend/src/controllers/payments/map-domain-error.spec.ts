import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  PaymentAlreadyProcessedError,
  PaymentAmountMismatchError,
  PaymentBookingNotPendingError,
  PaymentNotFoundError,
  PaymentWebhookSignatureError,
} from '@/modules/payments/domain/errors';

import { mapPaymentsDomainError } from './map-domain-error';

describe('mapPaymentsDomainError', () => {
  it('maps PaymentNotFoundError to NotFoundException', () => {
    expect(mapPaymentsDomainError(new PaymentNotFoundError())).toBeInstanceOf(NotFoundException);
  });

  it('maps PaymentBookingNotPendingError to ConflictException', () => {
    expect(mapPaymentsDomainError(new PaymentBookingNotPendingError())).toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps PaymentAmountMismatchError to BadRequestException', () => {
    expect(mapPaymentsDomainError(new PaymentAmountMismatchError(200_000, 100_000))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps PaymentWebhookSignatureError to BadRequestException', () => {
    expect(mapPaymentsDomainError(new PaymentWebhookSignatureError())).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps PaymentAlreadyProcessedError to ConflictException', () => {
    expect(mapPaymentsDomainError(new PaymentAlreadyProcessedError('txn-1'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps admin-only message to ForbiddenException', () => {
    const err = new Error('Only admins can manually confirm payments');
    expect(mapPaymentsDomainError(err)).toBeInstanceOf(ForbiddenException);
  });

  it('passes through unknown errors unchanged', () => {
    const err = new Error('something random');
    expect(mapPaymentsDomainError(err)).toBe(err);
  });
});
