import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  PaymentAlreadyProcessedError,
  PaymentAmountMismatchError,
  PaymentBookingNotPendingError,
  PaymentNotFoundError,
  PaymentWebhookSignatureError,
} from '@/modules/payments/domain/errors';

export function mapPaymentsDomainError(err: unknown): Error {
  if (err instanceof PaymentNotFoundError) return new NotFoundException(err.message);
  if (err instanceof PaymentBookingNotPendingError) return new ConflictException(err.message);
  if (err instanceof PaymentAmountMismatchError) return new BadRequestException(err.message);
  if (err instanceof PaymentWebhookSignatureError) return new BadRequestException(err.message);
  if (err instanceof PaymentAlreadyProcessedError) return new ConflictException(err.message);
  if (err instanceof Error && err.message === 'Only admins can manually confirm payments') {
    return new ForbiddenException(err.message);
  }
  return err as Error;
}
