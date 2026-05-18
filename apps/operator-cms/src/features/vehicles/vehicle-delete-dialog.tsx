import { useDeleteVehicle, type VehicleDto } from '@bookee/api-client';
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

interface VehicleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleDto | null;
}

export function VehicleDeleteDialog({ open, onOpenChange, vehicle }: VehicleDeleteDialogProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteVehicle();

  async function handleConfirm() {
    /* v8 ignore next -- dialog only opens when vehicle is non-null */
    if (!vehicle) return;
    try {
      await deleteMutation.mutateAsync({ id: vehicle.id });
      toast.success('Vehicle deleted');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/vehicles'] });
      onOpenChange(false);
    } catch (err) {
      if (isConflictError(err)) {
        toast.error(getApiErrorMessage(err, 'Vehicle is referenced by trips — cancel those first'));
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to delete vehicle'));
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete vehicle{' '}
            <span className="font-medium">{vehicle?.plateNumber}</span>. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="vehicle-delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            data-testid="vehicle-delete-confirm"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
