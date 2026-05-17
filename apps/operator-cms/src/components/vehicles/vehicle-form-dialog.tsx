import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateVehicle,
  useListSeatLayouts,
  useUpdateVehicle,
  type VehicleDto,
} from '@bookee/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthContext } from '@/lib/auth-context';

const vehicleSchema = z.object({
  companyId: z.number().int().positive('Company is required'),
  plateNumber: z.string().min(1, 'Plate number is required').max(20),
  type: z.string().min(1, 'Type is required').max(50),
  seatLayoutId: z.number().int().positive('Seat layout is required'),
  totalSeats: z.number().int().positive('Total seats must be at least 1'),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: VehicleDto;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: VehicleFormDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const { data: layouts = [] } = useListSeatLayouts();
  const isEdit = vehicle != null;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      companyId: user?.operatorId ?? 0,
      plateNumber: '',
      type: '',
      seatLayoutId: 0,
      totalSeats: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        vehicle
          ? {
              companyId: vehicle.companyId,
              plateNumber: vehicle.plateNumber,
              type: vehicle.type,
              seatLayoutId: vehicle.seatLayoutId,
              totalSeats: vehicle.totalSeats,
            }
          : {
              companyId: user?.operatorId ?? 0,
              plateNumber: '',
              type: '',
              seatLayoutId: 0,
              totalSeats: 0,
            },
      );
    }
  }, [open, vehicle, form, user]);

  async function onSubmit(values: VehicleFormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: vehicle.id,
          data: {
            plateNumber: values.plateNumber,
            type: values.type,
            seatLayoutId: values.seatLayoutId,
            totalSeats: values.totalSeats,
          },
        });
        toast.success('Vehicle updated');
      } else {
        await createMutation.mutateAsync({ data: values });
        toast.success('Vehicle created');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/vehicles'] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save vehicle'));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEdit && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        disabled={user?.operatorId != null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="51B-123.45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Sleeper, Limousine, Express…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seatLayoutId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Layout</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select seat layout" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {layouts.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name} ({l.rows}×{l.cols})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seats</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="40"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
