import { TripStatus } from './enums';

const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(from: TripStatus): TripStatus[] {
  return [...TRANSITIONS[from]];
}
