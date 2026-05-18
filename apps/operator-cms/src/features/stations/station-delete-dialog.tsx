import { type StationDto, useDeleteStation } from '@bookee/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getApiErrorMessage, isConflictError } from '@/lib/api-error';

interface StationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: StationDto | null;
}

export function StationDeleteDialog({ open, onOpenChange, station }: StationDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteStation();

  async function handleConfirm() {
    /* v8 ignore next -- dialog only opens when station is non-null */
    if (!station) return;
    try {
      await deleteMutation.mutateAsync({ id: station.id });
      toast.success('Station deleted');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/stations'] });
      onOpenChange(false);
    } catch (err) {
      if (isConflictError(err)) {
        toast.error(
          getApiErrorMessage(err, 'Station is referenced by routes — delete those first'),
        );
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to delete station'));
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete station?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-medium">{station?.name}</span>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="station-delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            data-testid="station-delete-confirm"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
