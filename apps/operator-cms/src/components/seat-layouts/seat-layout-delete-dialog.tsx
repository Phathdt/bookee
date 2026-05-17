import { type SeatLayoutDto, useDeleteSeatLayout } from '@bookee/api-client';
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

interface SeatLayoutDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: SeatLayoutDto | null;
}

export function SeatLayoutDeleteDialog({
  open,
  onOpenChange,
  layout,
}: SeatLayoutDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSeatLayout();

  async function handleConfirm() {
    if (!layout) return;
    try {
      await deleteMutation.mutateAsync({ id: layout.id });
      toast.success('Seat layout deleted');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/seat-layouts'] });
      onOpenChange(false);
    } catch (err) {
      if (isConflictError(err)) {
        toast.error(
          getApiErrorMessage(err, 'Seat layout is in use by vehicles — remove those first'),
        );
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to delete seat layout'));
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete seat layout?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <span className="font-medium">{layout?.name}</span>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
