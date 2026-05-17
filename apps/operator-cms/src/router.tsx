import { createBrowserRouter } from 'react-router-dom';

import { ProtectedLayout } from './components/shell/protected-layout';
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';
import { RoutesPage } from './pages/routes-page';
import { SeatLayoutsPage } from './pages/seat-layouts-page';
import { StationsPage } from './pages/stations-page';
import { TripsPage } from './pages/trips-page';
import { VehiclesPage } from './pages/vehicles-page';

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
