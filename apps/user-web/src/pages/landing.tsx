import { useGetHealth, type HealthResponseDto } from '@bookee/api-client';
import { Bus, RefreshCw } from 'lucide-react';

import { AuthDemo } from '@/components/auth-demo';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  const { data, isLoading, error, refetch } = useGetHealth<HealthResponseDto>();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight">
            <Bus className="size-9" />
            Bookee
          </h1>
          <p className="mt-2 text-muted-foreground">
            Đặt vé xe khách liên tỉnh nhanh chóng — nhiều nhà xe trên một nền tảng.
          </p>
        </header>

        <section className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 text-sm font-medium text-muted-foreground">Trạng thái backend</div>
          {isLoading && <p className="text-sm">Đang kiểm tra…</p>}
          {error != null && (
            <p className="text-sm text-destructive">
              Không kết nối được API. Backend đã chạy chưa?
            </p>
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
            Tải lại
          </Button>
        </section>

        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <AuthDemo />
        </section>
      </div>
    </main>
  );
}
