import { Bus } from 'lucide-react';

import { AuthDemo } from '@/features/auth/auth-demo';
import { HealthStatusCard } from '@/features/health/health-status-card';

export function LandingPage() {
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

        <HealthStatusCard />

        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <AuthDemo />
        </section>
      </div>
    </main>
  );
}
