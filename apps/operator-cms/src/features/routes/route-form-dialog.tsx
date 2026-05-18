import { zodResolver } from '@hookform/resolvers/zod';
import { type RouteDto, useCreateRoute, useListStations, useUpdateRoute } from '@bookee/api-client';
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

const routeSchema = z.object({
  companyId: z.number().int().positive('Company is required'),
  fromStationId: z.number().int().positive('Origin station is required'),
  toStationId: z.number().int().positive('Destination station is required'),
  distanceKm: z.number().positive('Distance must be positive'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
});

type RouteFormValues = z.infer<typeof routeSchema>;

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: RouteDto;
}

export function RouteFormDialog({ open, onOpenChange, route }: RouteFormDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const { data: stations = [] } = useListStations();
  const isEdit = route != null;

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      companyId: user?.operatorId ?? 0,
      fromStationId: 0,
      toStationId: 0,
      distanceKm: 0,
      durationMinutes: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        route
          ? {
              companyId: route.companyId,
              fromStationId: route.fromStationId,
              toStationId: route.toStationId,
              distanceKm: route.distanceKm,
              durationMinutes: route.durationMinutes,
            }
          : {
              companyId: user?.operatorId ?? 0,
              fromStationId: 0,
              toStationId: 0,
              distanceKm: 0,
              durationMinutes: 0,
            },
      );
    }
  }, [open, route, form, user]);

  async function onSubmit(values: RouteFormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: route.id,
          data: { distanceKm: values.distanceKm, durationMinutes: values.durationMinutes },
        });
        toast.success('Route updated');
      } else {
        await createMutation.mutateAsync({ data: values });
        toast.success('Route created');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/routes'] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save route'));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Route' : 'Add Route'}</DialogTitle>
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
                        data-testid="route-form-company-id-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isEdit && (
              <>
                <FormField
                  control={form.control}
                  name="fromStationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Station</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="route-form-from-station-id-select">
                            <SelectValue placeholder="Select origin station" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stations.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name} — {s.city}
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
                  name="toStationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Station</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : ''}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="route-form-to-station-id-select">
                            <SelectValue placeholder="Select destination station" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stations.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name} — {s.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="distanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="350"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        data-testid="route-form-distance-km-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="480"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        data-testid="route-form-duration-minutes-input"
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
                data-testid="route-form-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="route-form-submit">
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create route'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
