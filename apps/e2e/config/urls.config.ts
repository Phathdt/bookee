export const URLS = {
  APP: process.env.APP_URL ?? 'http://localhost:5174',
  API: process.env.API_URL ?? 'http://localhost:3000/api/v1',
  ROUTES: {
    LANDING: '/',
  },
};

export function getAppUrl(route: string): string {
  return `${URLS.APP}${route}`;
}

export function getApiUrl(path: string): string {
  return `${URLS.API}${path}`;
}
