import { Outlet } from 'react-router-dom';

import { AuthGuard } from '@/features/auth/auth-guard';
import { SidebarNav } from './sidebar-nav';
import { Topbar } from './topbar';

interface ProtectedLayoutProps {
  requireAdmin?: boolean;
}

export function ProtectedLayout({ requireAdmin = false }: ProtectedLayoutProps) {
  return (
    <AuthGuard requireAdmin={requireAdmin}>
      <div className="flex h-screen flex-col overflow-hidden">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <SidebarNav />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
