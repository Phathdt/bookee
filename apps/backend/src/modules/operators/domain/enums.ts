export const OPERATOR_STATUSES = ['pending', 'active', 'suspended'] as const;
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];

export function isOperatorStatus(value: unknown): value is OperatorStatus {
  return typeof value === 'string' && (OPERATOR_STATUSES as readonly string[]).includes(value);
}
