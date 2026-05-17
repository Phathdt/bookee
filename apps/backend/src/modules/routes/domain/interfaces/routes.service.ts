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

/**
 * `actorOperatorId` = the operatorId on the caller's JWT (null for admin).
 * Service enforces that operator staff can only mutate routes belonging to
 * their own operator; admin (null) bypasses the check.
 */
export interface ActorContext {
  actorOperatorId: number | null;
}

export abstract class IRoutesService {
  abstract list(filter: RouteListFilter): Promise<Route[]>;
  abstract getById(id: number): Promise<Route>;
  abstract create(input: CreateRouteInput, actor: ActorContext): Promise<Route>;
  abstract update(id: number, input: UpdateRouteInput, actor: ActorContext): Promise<Route>;
  abstract delete(id: number, actor: ActorContext): Promise<void>;
}
