import { useListOperators, type OperatorDto } from '@bookee/api-client';
import { Building2 } from 'lucide-react';

export function OperatorsList() {
  const { data, isLoading, error } = useListOperators<OperatorDto[]>();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Building2 className="size-4" />
        Active operators
      </div>

      {isLoading && <p className="text-sm">Loading…</p>}
      {error != null && (
        <p className="text-sm text-destructive">
          {(error as { message?: string }).message ?? 'Failed to load operators'}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No active operators yet. An admin needs to create + activate one.
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {data.map((op) => (
            <li key={op.id} className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <div className="font-medium">{op.name}</div>
                <div className="text-xs text-muted-foreground">Hotline: {op.hotline}</div>
              </div>
              <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {op.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
