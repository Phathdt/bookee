export const URLS = {
  /** backward-compat alias — equals APP_USER_URL */
  APP: process.env.APP_USER_URL ?? process.env.APP_URL ?? 'http://localhost:5174',
  USER_APP: process.env.APP_USER_URL ?? process.env.APP_URL ?? 'http://localhost:5174',
  OPERATOR_APP: process.env.APP_OPERATOR_URL ?? 'http://localhost:5173',
  API: process.env.API_URL ?? 'http://localhost:3000/api/v1',
  ROUTES: {
    LANDING: '/',
    OPERATOR_LOGIN: '/login',
    OPERATOR_DASHBOARD: '/',
    OPERATOR_STATIONS: '/stations',
    OPERATOR_ROUTES: '/routes',
    OPERATOR_SEAT_LAYOUTS: '/seat-layouts',
    OPERATOR_VEHICLES: '/vehicles',
    OPERATOR_TRIPS: '/trips',
  },
};

/** Navigate to a user-web route (port 5174). */
export function getUserAppUrl(route: string): string {
  return `${URLS.USER_APP}${route}`;
}

/** Navigate to an operator-CMS route (port 5173). */
export function getOperatorAppUrl(route: string): string {
  return `${URLS.OPERATOR_APP}${route}`;
}

/** Backward-compat alias used by the existing landing page. */
export function getAppUrl(route: string): string {
  return getUserAppUrl(route);
}

export function getApiUrl(path: string): string {
  return `${URLS.API}${path}`;
}
