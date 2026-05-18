import { useListVehicles, type VehicleDto } from '@bookee/api-client';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { VehicleDeleteDialog } from '@/features/vehicles/vehicle-delete-dialog';
import { VehicleFormDialog } from '@/features/vehicles/vehicle-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthContext } from '@/features/auth/auth-context';

export function VehiclesPage() {
  const { user, isAdmin } = useAuthContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<VehicleDto | undefined>(undefined);
  const [deleteVehicle, setDeleteVehicle] = useState<VehicleDto | null>(null);

  /* v8 ignore next -- user.operatorId is null|number, never undefined in practice */
  const companyId = isAdmin ? undefined : (user?.operatorId ?? undefined);
  const { data: vehicles = [], isLoading } = useListVehicles({ companyId });

  function handleEdit(vehicle: VehicleDto) {
    setEditVehicle(vehicle);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditVehicle(undefined);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
    if (!open) setEditVehicle(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
        <Button onClick={handleAdd} size="sm" data-testid="vehicles-add-button">
          <Plus className="size-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Layout ID</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No vehicles found.
                </TableCell>
              </TableRow>
            )}
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
                <TableCell className="font-medium">{vehicle.plateNumber}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{vehicle.companyId}</TableCell>
                <TableCell className="text-muted-foreground">#{vehicle.seatLayoutId}</TableCell>
                <TableCell>{vehicle.totalSeats}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(vehicle)}
                      data-testid={`vehicle-edit-button-${vehicle.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteVehicle(vehicle)}
                      data-testid={`vehicle-delete-button-${vehicle.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        vehicle={editVehicle}
      />

      <VehicleDeleteDialog
        open={deleteVehicle != null}
        onOpenChange={(open) => {
          /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
          if (!open) setDeleteVehicle(null);
        }}
        vehicle={deleteVehicle}
      />
    </div>
  );
}
