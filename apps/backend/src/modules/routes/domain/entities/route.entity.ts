export interface Route {
  id: number;
  companyId: number;
  fromStationId: number;
  toStationId: number;
  distanceKm: number;
  durationMinutes: number;
}
