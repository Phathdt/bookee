import { createBrowserRouter } from 'react-router-dom';

import { ProtectedLayout } from '@/components/shell/protected-layout';
import { LoginPage } from '@/features/auth/login-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { RoutesPage } from '@/features/routes/routes-page';
import { SeatLayoutsPage } from '@/features/seat-layouts/seat-layouts-page';
import { StationsPage } from '@/features/stations/stations-page';
import { TripsPage } from '@/features/trips/trips-page';
import { VehiclesPage } from '@/features/vehicles/vehicles-page';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/routes', element: <RoutesPage /> },
      { path: '/vehicles', element: <VehiclesPage /> },
      { path: '/trips', element: <TripsPage /> },
    ],
  },
  {
    element: <ProtectedLayout requireAdmin />,
    children: [
      { path: '/stations', element: <StationsPage /> },
      { path: '/seat-layouts', element: <SeatLayoutsPage /> },
    ],
  },
]);
