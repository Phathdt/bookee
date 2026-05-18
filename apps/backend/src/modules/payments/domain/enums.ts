export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'timeout'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
