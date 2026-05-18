import { zodResolver } from '@hookform/resolvers/zod';
import { type TripDto, useCreateTrip, useListRoutes, useListVehicles } from '@bookee/api-client';
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
import { useAuthContext } from '@/features/auth/auth-context';

const tripSchema = z.object({
  routeId: z.number().int().positive('Route is required'),
  vehicleId: z.number().int().positive('Vehicle is required'),
  departureTime: z.string().min(1, 'Departure time is required'),
  arrivalTime: z.string().min(1, 'Arrival time is required'),
  basePrice: z.number().min(0, 'Price must be non-negative'),
});

type TripFormValues = z.infer<typeof tripSchema>;

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: TripDto;
}

function toDatetimeLocal(iso: string): string {
  return iso.replace('Z', '').slice(0, 16);
}

function toISOString(local: string): string {
  return new Date(local).toISOString();
}

export function TripFormDialog({ open, onOpenChange, trip }: TripFormDialogProps) {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuthContext();
  const createMutation = useCreateTrip();

  /* v8 ignore next -- user.operatorId is null|number, never undefined in practice */
  const companyId = isAdmin ? undefined : (user?.operatorId ?? undefined);
  const { data: routes = [] } = useListRoutes({ companyId });
  const { data: vehicles = [] } = useListVehicles({ companyId });

  const isEdit = trip != null;

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      routeId: 0,
      vehicleId: 0,
      departureTime: '',
      arrivalTime: '',
      basePrice: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        trip
          ? {
              routeId: trip.routeId,
              vehicleId: trip.vehicleId,
              departureTime: toDatetimeLocal(trip.departureTime),
              arrivalTime: toDatetimeLocal(trip.arrivalTime),
              basePrice: trip.basePrice,
            }
          : { routeId: 0, vehicleId: 0, departureTime: '', arrivalTime: '', basePrice: 0 },
      );
    }
  }, [open, trip, form]);

  async function onSubmit(values: TripFormValues) {
    try {
      await createMutation.mutateAsync({
        data: {
          routeId: values.routeId,
          vehicleId: values.vehicleId,
          departureTime: toISOString(values.departureTime),
          arrivalTime: toISOString(values.arrivalTime),
          basePrice: values.basePrice,
        },
      });
      toast.success('Trip created');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/trips'] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save trip'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Trip Details' : 'Add Trip'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="routeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="trip-form-route-id-select">
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          Route #{r.id} — {r.distanceKm} km
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
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="trip-form-vehicle-id-select">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.plateNumber} ({v.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="departureTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departure</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={isEdit}
                        data-testid="trip-form-departure-time-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="arrivalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arrival</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={isEdit}
                        data-testid="trip-form-arrival-time-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price (VND)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="150000"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      disabled={isEdit}
                      data-testid="trip-form-base-price-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="trip-form-cancel"
              >
                {isEdit ? 'Close' : 'Cancel'}
              </Button>
              {!isEdit && (
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="trip-form-submit"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create trip'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
