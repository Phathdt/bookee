import { Route } from '../entities/route.entity';

export interface CreateRouteInput {
  companyId: number;
  fromStationId: number;
  toStationId: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface UpdateRouteInput {
  distanceKm?: number;
  durationMinutes?: number;
}

export interface RouteListFilter {
  companyId?: number;
  fromStationId?: number;
  toStationId?: number;
}

export abstract class IRoutesRepository {
  abstract findById(id: number): Promise<Route | null>;
  abstract list(filter: RouteListFilter): Promise<Route[]>;
  abstract create(input: CreateRouteInput): Promise<Route>;
  abstract update(id: number, input: UpdateRouteInput): Promise<Route>;
  abstract delete(id: number): Promise<void>;
}
