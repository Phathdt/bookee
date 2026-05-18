import { type TripDto, type TripDtoStatus, useSetTripStatus } from '@bookee/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';

// Valid state machine transitions
const TRANSITIONS: Record<TripDtoStatus, TripDtoStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const TRANSITION_LABELS: Record<TripDtoStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'Start',
  completed: 'Complete',
  cancelled: 'Cancel',
};

const TRANSITION_VARIANTS: Record<TripDtoStatus, 'default' | 'outline' | 'ghost' | 'destructive'> =
  {
    scheduled: 'outline',
    in_progress: 'default',
    completed: 'outline',
    cancelled: 'destructive',
  };

interface TripStatusActionsProps {
  trip: TripDto;
}

export function TripStatusActions({ trip }: TripStatusActionsProps) {
  const queryClient = useQueryClient();
  const statusMutation = useSetTripStatus();

  /* v8 ignore next -- TRANSITIONS covers all TripDtoStatus values, fallback is unreachable */
  const nextStatuses = TRANSITIONS[trip.status] ?? [];

  if (nextStatuses.length === 0) return null;

  async function handleTransition(nextStatus: TripDtoStatus) {
    try {
      await statusMutation.mutateAsync({ id: trip.id, data: { status: nextStatus } });
      toast.success(`Trip #${trip.id} → ${nextStatus.replace('_', ' ')}`);
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/trips'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update trip status'));
    }
  }

  return (
    <div className="flex items-center gap-1">
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={TRANSITION_VARIANTS[next]}
          disabled={statusMutation.isPending}
          onClick={() => void handleTransition(next)}
          className={next === 'cancelled' ? 'text-destructive hover:text-destructive' : ''}
          data-testid={`trip-status-action-${next}`}
        >
          {TRANSITION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
