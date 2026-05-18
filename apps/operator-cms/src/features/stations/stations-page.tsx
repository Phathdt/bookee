import { type StationDto, useListStations } from '@bookee/api-client';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { StationDeleteDialog } from '@/features/stations/station-delete-dialog';
import { StationFormDialog } from '@/features/stations/station-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function StationsPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editStation, setEditStation] = useState<StationDto | undefined>(undefined);
  const [deleteStation, setDeleteStation] = useState<StationDto | null>(null);

  const { data: stations = [], isLoading } = useListStations({ q: search || undefined });

  function handleEdit(station: StationDto) {
    setEditStation(station);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditStation(undefined);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
    if (!open) setEditStation(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Stations</h1>
        <Button onClick={handleAdd} size="sm" data-testid="stations-add-button">
          <Plus className="size-4" />
          Add Station
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="stations-search-input"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Lat / Lng</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && stations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No stations found.
                </TableCell>
              </TableRow>
            )}
            {stations.map((station) => (
              <TableRow key={station.id} data-testid={`station-row-${station.id}`}>
                <TableCell className="font-medium">{station.name}</TableCell>
                <TableCell>{station.city}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {station.address}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(station)}
                      data-testid={`station-edit-button-${station.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteStation(station)}
                      data-testid={`station-delete-button-${station.id}`}
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

      <StationFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        station={editStation}
      />

      <StationDeleteDialog
        open={deleteStation != null}
        onOpenChange={(open) => {
          /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
          if (!open) setDeleteStation(null);
        }}
        station={deleteStation}
      />
    </div>
  );
}
