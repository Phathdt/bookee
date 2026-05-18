import { type SeatLayoutDto, useListSeatLayouts } from '@bookee/api-client';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { SeatLayoutDeleteDialog } from '@/features/seat-layouts/seat-layout-delete-dialog';
import { SeatLayoutFormDialog } from '@/features/seat-layouts/seat-layout-form-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SeatLayoutsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editLayout, setEditLayout] = useState<SeatLayoutDto | undefined>(undefined);
  const [deleteLayout, setDeleteLayout] = useState<SeatLayoutDto | null>(null);

  const { data: layouts = [], isLoading } = useListSeatLayouts();

  function handleEdit(layout: SeatLayoutDto) {
    setEditLayout(layout);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditLayout(undefined);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
    if (!open) setEditLayout(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Seat Layouts</h1>
        <Button onClick={handleAdd} size="sm" data-testid="seat-layouts-add-button">
          <Plus className="size-4" />
          Add Layout
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Cols</TableHead>
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
            {!isLoading && layouts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No seat layouts found.
                </TableCell>
              </TableRow>
            )}
            {layouts.map((layout) => (
              <TableRow key={layout.id} data-testid={`seat-layout-row-${layout.id}`}>
                <TableCell className="text-muted-foreground">#{layout.id}</TableCell>
                <TableCell className="font-medium">{layout.name}</TableCell>
                <TableCell>{layout.rows}</TableCell>
                <TableCell>{layout.cols}</TableCell>
                <TableCell>{layout.seats?.length ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(layout)}
                      data-testid={`seat-layout-edit-button-${layout.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteLayout(layout)}
                      data-testid={`seat-layout-delete-button-${layout.id}`}
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

      <SeatLayoutFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        layout={editLayout}
      />

      <SeatLayoutDeleteDialog
        open={deleteLayout != null}
        onOpenChange={(open) => {
          /* v8 ignore next -- Radix controlled dialog fires onOpenChange(false) only */
          if (!open) setDeleteLayout(null);
        }}
        layout={deleteLayout}
      />
    </div>
  );
}
