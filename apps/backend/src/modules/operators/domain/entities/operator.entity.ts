import { OperatorStatus } from '../enums';

/**
 * Operator (bus company) domain entity. Plain interface — canonical shape
 * exchanged between Service and Repository.
 */
export interface Operator {
  id: number;
  name: string;
  hotline: string;
  logo: string | null;
  status: OperatorStatus;
}
