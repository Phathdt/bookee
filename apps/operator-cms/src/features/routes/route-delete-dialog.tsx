import { type RouteDto, useDeleteRoute } from '@bookee/api-client';
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

interface RouteDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteDto | null;
}

export function RouteDeleteDialog({ open, onOpenChange, route }: RouteDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteRoute();

  async function handleConfirm() {
    /* v8 ignore next -- dialog only opens when route is non-null */
    if (!route) return;
    try {
      await deleteMutation.mutateAsync({ id: route.id });
      toast.success('Route deleted');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/routes'] });
      onOpenChange(false);
    } catch (err) {
      if (isConflictError(err)) {
        toast.error(getApiErrorMessage(err, 'Route is referenced by trips — delete those first'));
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to delete route'));
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete route?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete route <span className="font-medium">#{route?.id}</span>{' '}
            (company {route?.companyId}). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="route-delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            data-testid="route-delete-confirm"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
