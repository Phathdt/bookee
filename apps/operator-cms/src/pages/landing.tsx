import { useGetHealth, type HealthResponseDto } from '@bookee/api-client';
import { Activity, RefreshCw } from 'lucide-react';

import { AuthDemo } from '@/components/auth-demo';
import { OperatorsList } from '@/components/operators-list';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  const { data, isLoading, error, refetch } = useGetHealth<HealthResponseDto>();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Operator CMS</h1>
          <p className="mt-2 text-muted-foreground">
            Bookee — multi-operator trip booking platform.
          </p>
        </header>

        <section className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="size-4" />
            Backend status
          </div>
          {isLoading && <p className="text-sm">Checking…</p>}
          {error != null && (
            <p className="text-sm text-destructive">API unreachable. Is the backend running?</p>
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
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </section>

        <section className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
          <AuthDemo />
        </section>

        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <OperatorsList />
        </section>
      </div>
    </main>
  );
}
