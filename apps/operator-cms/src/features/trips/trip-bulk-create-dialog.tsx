import { zodResolver } from '@hookform/resolvers/zod';
import { useBulkCreateTrips, useListRoutes, useListVehicles } from '@bookee/api-client';
import { useQueryClient } from '@tanstack/react-query';
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

const bulkSchema = z
  .object({
    routeId: z.number().int().positive('Route is required'),
    vehicleId: z.number().int().positive('Vehicle is required'),
    basePrice: z.number().min(0, 'Price must be non-negative'),
    dateStart: z.string().min(1, 'Start date is required'),
    dateEnd: z.string().min(1, 'End date is required'),
    dailyDepartureTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:mm'),
    tripDurationMinutes: z.number().int().positive('Duration must be at least 1 minute'),
  })
  .refine((d) => d.dateEnd >= d.dateStart, {
    message: 'End date must be on or after start date',
    path: ['dateEnd'],
  });

type BulkFormValues = z.infer<typeof bulkSchema>;

interface TripBulkCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripBulkCreateDialog({ open, onOpenChange }: TripBulkCreateDialogProps) {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuthContext();
  const bulkMutation = useBulkCreateTrips();

  /* v8 ignore next -- user.operatorId is null|number, never undefined in practice */
  const companyId = isAdmin ? undefined : (user?.operatorId ?? undefined);
  const { data: routes = [] } = useListRoutes({ companyId });
  const { data: vehicles = [] } = useListVehicles({ companyId });

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      routeId: 0,
      vehicleId: 0,
      basePrice: 0,
      dateStart: '',
      dateEnd: '',
      dailyDepartureTime: '08:00',
      tripDurationMinutes: 480,
    },
  });

  async function onSubmit(values: BulkFormValues) {
    try {
      await bulkMutation.mutateAsync({
        data: {
          routeId: values.routeId,
          vehicleId: values.vehicleId,
          basePrice: values.basePrice,
          dateRange: { start: values.dateStart, end: values.dateEnd },
          dailyDepartureTime: values.dailyDepartureTime,
          tripDurationMinutes: values.tripDurationMinutes,
        },
      });
      toast.success('Trips bulk-created successfully');
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/trips'] });
      onOpenChange(false);
      form.reset();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to bulk-create trips'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Create Trips</DialogTitle>
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
                  >
                    <FormControl>
                      <SelectTrigger data-testid="trip-bulk-form-route-select">
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
                  >
                    <FormControl>
                      <SelectTrigger data-testid="trip-bulk-form-vehicle-select">
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
                      data-testid="trip-bulk-form-base-price-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dateStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="trip-bulk-form-start-date-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="trip-bulk-form-end-date-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="dailyDepartureTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Departure (HH:mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="trip-bulk-form-daily-departure-time-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tripDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="480"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        data-testid="trip-bulk-form-trip-duration-minutes-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="trip-bulk-form-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkMutation.isPending}
                data-testid="trip-bulk-form-submit"
              >
                {bulkMutation.isPending ? 'Creating…' : 'Bulk Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
