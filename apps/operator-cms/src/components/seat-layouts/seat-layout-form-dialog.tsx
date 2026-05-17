import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateSeatLayoutBodyDto,
  type SeatLayoutDto,
  useCreateSeatLayout,
  useUpdateSeatLayout,
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
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';

const seatLayoutSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  rows: z.number().int().positive('Rows must be at least 1'),
  cols: z.number().int().positive('Cols must be at least 1'),
  seatsJson: z.string().min(1, 'Seats JSON is required'),
});

type SeatLayoutFormValues = z.infer<typeof seatLayoutSchema>;

interface SeatLayoutFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: SeatLayoutDto;
}

const PLACEHOLDER_SEATS = JSON.stringify(
  [
    { code: 'A1', row: 1, col: 1 },
    { code: 'A2', row: 1, col: 2 },
  ],
  null,
  2,
);

export function SeatLayoutFormDialog({ open, onOpenChange, layout }: SeatLayoutFormDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateSeatLayout();
  const updateMutation = useUpdateSeatLayout();
  const isEdit = layout != null;

  const form = useForm<SeatLayoutFormValues>({
    resolver: zodResolver(seatLayoutSchema),
    defaultValues: { name: '', rows: 1, cols: 2, seatsJson: PLACEHOLDER_SEATS },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        layout
          ? {
              name: layout.name,
              rows: layout.rows,
              cols: layout.cols,
              seatsJson: layout.seats ? JSON.stringify(layout.seats, null, 2) : PLACEHOLDER_SEATS,
            }
          : { name: '', rows: 1, cols: 2, seatsJson: PLACEHOLDER_SEATS },
      );
    }
  }, [open, layout, form]);

  async function onSubmit(values: SeatLayoutFormValues) {
    try {
      let seats: CreateSeatLayoutBodyDto['seats'];
      try {
        seats = JSON.parse(values.seatsJson) as CreateSeatLayoutBodyDto['seats'];
      } catch {
        form.setError('seatsJson', { message: 'Invalid JSON' });
        return;
      }

      if (isEdit) {
        await updateMutation.mutateAsync({
          id: layout.id,
          data: { name: values.name, rows: values.rows, cols: values.cols },
        });
        toast.success('Seat layout updated');
      } else {
        const body: CreateSeatLayoutBodyDto = {
          name: values.name,
          rows: values.rows,
          cols: values.cols,
          seats,
        };
        await createMutation.mutateAsync({ data: body });
        toast.success('Seat layout created');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/seat-layouts'] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save seat layout'));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Seat Layout' : 'Add Seat Layout'}</DialogTitle>
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
                    <Input placeholder="Sleeper 40 seats" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rows"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rows</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cols"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cols</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit && (
              <FormField
                control={form.control}
                name="seatsJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats (JSON array)</FormLabel>
                    <FormControl>
                      <Textarea
                        className="font-mono text-xs"
                        rows={6}
                        placeholder={PLACEHOLDER_SEATS}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create layout'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
