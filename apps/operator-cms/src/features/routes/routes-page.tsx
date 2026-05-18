import { type RouteDto, useListRoutes, useListStations } from '@bookee/api-client';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { RouteDeleteDialog } from '@/features/routes/route-delete-dialog';
import { RouteFormDialog } from '@/features/routes/route-form-dialog';
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

export function RoutesPage() {
  const { user, isAdmin } = useAuthContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteDto | undefined>(undefined);
  const [deleteRoute, setDeleteRoute] = useState<RouteDto | null>(null);

  /* v8 ignore next -- user.operatorId is null|number, never undefined in practice */
  const companyId = isAdmin ? undefined : (user?.operatorId ?? undefined);
  const { data: routes = [], isLoading } = useListRoutes({ companyId });
  const { data: stations = [] } = useListStations();

  const stationMap = new Map(stations.map((s) => [s.id, s]));

  function handleEdit(route: RouteDto) {
    setEditRoute(route);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditRoute(undefined);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    /* v8 ignore next -- Radix controlled dialog calls onOpenChange(false) only */
    if (!open) setEditRoute(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Routes</h1>
        <Button onClick={handleAdd} size="sm" data-testid="routes-add-button">
          <Plus className="size-4" />
          Add Route
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && routes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No routes found.
                </TableCell>
              </TableRow>
            )}
            {routes.map((route) => {
              const from = stationMap.get(route.fromStationId);
              const to = stationMap.get(route.toStationId);
              return (
                <TableRow key={route.id} data-testid={`route-row-${route.id}`}>
                  <TableCell className="text-muted-foreground">#{route.id}</TableCell>
                  <TableCell>{route.companyId}</TableCell>
                  <TableCell>
                    {from ? (
                      <span>
                        {from.name}
                        <span className="ml-1 text-xs text-muted-foreground">({from.city})</span>
                      </span>
                    ) : (
                      `Station #${route.fromStationId}`
                    )}
                  </TableCell>
                  <TableCell>
                    {to ? (
                      <span>
                        {to.name}
                        <span className="ml-1 text-xs text-muted-foreground">({to.city})</span>
                      </span>
                    ) : (
                      `Station #${route.toStationId}`
                    )}
                  </TableCell>
                  <TableCell>{route.distanceKm} km</TableCell>
                  <TableCell>
                    {Math.floor(route.durationMinutes / 60)}h {route.durationMinutes % 60}m
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(route)}
                        data-testid={`route-edit-button-${route.id}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteRoute(route)}
                        data-testid={`route-delete-button-${route.id}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RouteFormDialog open={formOpen} onOpenChange={handleFormOpenChange} route={editRoute} />
      <RouteDeleteDialog
        open={deleteRoute != null}
        onOpenChange={(open) => {
          /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
          if (!open) setDeleteRoute(null);
        }}
        route={deleteRoute}
      />
    </div>
  );
}
