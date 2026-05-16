import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from './pages/landing';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
]);
