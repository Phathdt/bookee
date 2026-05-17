import { Route } from '../../domain/entities/route.entity';
import { RouteForbiddenError, RouteNotFoundError, RouteValidationError } from '../../domain/errors';
import {
  CreateRouteInput,
  IRoutesRepository,
  RouteListFilter,
  UpdateRouteInput,
} from '../../domain/interfaces/routes.repository';
import { ActorContext, IRoutesService } from '../../domain/interfaces/routes.service';

export class RoutesService implements IRoutesService {
  constructor(private readonly routes: IRoutesRepository) {}

  private assertOperatorScope(routeCompanyId: number, actor: ActorContext): void {
    // null actorOperatorId = admin (bypass scoping).
    if (actor.actorOperatorId !== null && actor.actorOperatorId !== routeCompanyId) {
      throw new RouteForbiddenError();
    }
  }

  private assertCreatePayload(input: CreateRouteInput): void {
    if (input.fromStationId === input.toStationId) {
      throw new RouteValidationError('fromStationId and toStationId must differ');
    }
    if (input.distanceKm <= 0) {
      throw new RouteValidationError('distanceKm must be > 0');
    }
    if (input.durationMinutes <= 0) {
      throw new RouteValidationError('durationMinutes must be > 0');
    }
  }

  private assertUpdatePayload(input: UpdateRouteInput): void {
    if (input.distanceKm !== undefined && input.distanceKm <= 0) {
      throw new RouteValidationError('distanceKm must be > 0');
    }
    if (input.durationMinutes !== undefined && input.durationMinutes <= 0) {
      throw new RouteValidationError('durationMinutes must be > 0');
    }
  }

  list(filter: RouteListFilter): Promise<Route[]> {
    return this.routes.list(filter);
  }

  async getById(id: number): Promise<Route> {
    const r = await this.routes.findById(id);
    if (!r) throw new RouteNotFoundError();
    return r;
  }

  async create(input: CreateRouteInput, actor: ActorContext): Promise<Route> {
    this.assertOperatorScope(input.companyId, actor);
    this.assertCreatePayload(input);
    return this.routes.create(input);
  }

  async update(id: number, input: UpdateRouteInput, actor: ActorContext): Promise<Route> {
    const existing = await this.routes.findById(id);
    if (!existing) throw new RouteNotFoundError();
    this.assertOperatorScope(existing.companyId, actor);
    this.assertUpdatePayload(input);
    return this.routes.update(id, input);
  }

  async delete(id: number, actor: ActorContext): Promise<void> {
    const existing = await this.routes.findById(id);
    if (!existing) throw new RouteNotFoundError();
    this.assertOperatorScope(existing.companyId, actor);
    await this.routes.delete(id);
  }
}
