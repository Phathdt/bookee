import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useHealthStatus } from './hooks/use-health-status';

export function HealthStatusCard() {
  const { data, isLoading, error, refetch } = useHealthStatus();

  return (
    <section className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 text-sm font-medium text-muted-foreground">Trạng thái backend</div>
      {isLoading && <p className="text-sm">Đang kiểm tra…</p>}
      {error != null && (
        <p className="text-sm text-destructive">Không kết nối được API. Backend đã chạy chưa?</p>
      )}
      {data && (
        <p className="text-sm">
          <span className="font-medium">status:</span>{' '}
          <span className="rounded bg-secondary px-2 py-0.5 text-secondary-foreground">
            {data.status}
          </span>
        </p>
      )}
      <Button
        className="mt-4"
        size="sm"
        variant="outline"
        onClick={refetch}
        disabled={isLoading}
        data-testid="health-refresh"
      >
        <RefreshCw className="size-4" />
        Tải lại
      </Button>
    </section>
  );
}
