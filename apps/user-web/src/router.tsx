import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from '@/features/landing/landing-page';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
]);
