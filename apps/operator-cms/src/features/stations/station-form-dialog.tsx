import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateStationBodyDto,
  type StationDto,
  useCreateStation,
  useUpdateStation,
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
import { getApiErrorMessage } from '@/lib/api-error';

const stationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface StationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station?: StationDto;
}

export function StationFormDialog({ open, onOpenChange, station }: StationFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateStation();
  const updateMutation = useUpdateStation();
  const isEdit = station != null;

  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: { name: '', address: '', city: '', lat: 0, lng: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        station
          ? {
              name: station.name,
              address: station.address,
              city: station.city,
              lat: station.lat,
              lng: station.lng,
            }
          : { name: '', address: '', city: '', lat: 0, lng: 0 },
      );
    }
  }, [open, station, form]);

  async function onSubmit(values: StationFormValues) {
    try {
      const body: CreateStationBodyDto = values;
      if (isEdit) {
        await updateMutation.mutateAsync({ id: station.id, data: body });
        toast.success('Station updated');
      } else {
        await createMutation.mutateAsync({ data: body });
        toast.success('Station created');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/stations'] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save station'));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Station' : 'Add Station'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ben Xe Mien Dong"
                      {...field}
                      data-testid="station-form-name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="292 Dinh Bo Linh, Binh Thanh, Ho Chi Minh"
                      {...field}
                      data-testid="station-form-address-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ho Chi Minh"
                      {...field}
                      data-testid="station-form-city-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="10.8142"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        data-testid="station-form-lat-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="106.7190"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        data-testid="station-form-lng-input"
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
                data-testid="station-form-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="station-form-submit">
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create station'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
