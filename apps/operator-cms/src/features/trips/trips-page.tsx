import { type TripDto, type TripDtoStatus, useListTrips } from '@bookee/api-client';
import { CalendarPlus, Plus } from 'lucide-react';
import { useState } from 'react';

import { TripBulkCreateDialog } from '@/features/trips/trip-bulk-create-dialog';
import { TripFormDialog } from '@/features/trips/trip-form-dialog';
import { TripStatusActions } from '@/features/trips/trip-status-actions';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthContext } from '@/features/auth/auth-context';

const STATUS_BADGE: Record<TripDtoStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function TripsPage() {
  const { user, isAdmin } = useAuthContext();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewTrip, setViewTrip] = useState<TripDto | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<TripDtoStatus | 'all'>('all');

  /* v8 ignore next -- user.operatorId is null|number, never undefined in practice */
  const companyId = isAdmin ? undefined : (user?.operatorId ?? undefined);

  const { data: trips = [], isLoading } = useListTrips({
    companyId,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  function handleAdd() {
    setViewTrip(undefined);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
    if (!open) setViewTrip(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Trips</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBulkOpen(true)}
            size="sm"
            variant="outline"
            data-testid="trips-bulk-create-button"
          >
            <CalendarPlus className="size-4" />
            Bulk Create
          </Button>
          <Button onClick={handleAdd} size="sm" data-testid="trips-add-button">
            <Plus className="size-4" />
            Add Trip
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TripDtoStatus | 'all')}
        >
          <SelectTrigger className="w-40" data-testid="trips-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && trips.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No trips found.
                </TableCell>
              </TableRow>
            )}
            {trips.map((trip) => (
              <TableRow key={trip.id} data-testid={`trip-row-${trip.id}`}>
                <TableCell className="text-muted-foreground">#{trip.id}</TableCell>
                <TableCell>#{trip.routeId}</TableCell>
                <TableCell>#{trip.vehicleId}</TableCell>
                <TableCell className="text-sm">{formatDatetime(trip.departureTime)}</TableCell>
                <TableCell className="text-sm">{formatDatetime(trip.arrivalTime)}</TableCell>
                <TableCell className="text-sm">
                  {trip.basePrice.toLocaleString('vi-VN')} ₫
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[trip.status]}`}
                  >
                    {trip.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setViewTrip(trip);
                        setFormOpen(true);
                      }}
                      data-testid={`trip-view-button-${trip.id}`}
                    >
                      View
                    </Button>
                    <TripStatusActions trip={trip} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TripFormDialog open={formOpen} onOpenChange={handleFormOpenChange} trip={viewTrip} />
      <TripBulkCreateDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
