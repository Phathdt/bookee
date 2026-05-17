import { Vehicle } from '../entities/vehicle.entity';

import { CreateVehicleInput, UpdateVehicleInput, VehicleListFilter } from './vehicles.repository';

/**
 * `actorOperatorId` = the operatorId on the caller's JWT (null for admin).
 * Service enforces that operator staff can only mutate vehicles belonging to
 * their own operator; admin (null) bypasses the check.
 */
export interface ActorContext {
  actorOperatorId: number | null;
}

export abstract class IVehiclesService {
  abstract list(filter: VehicleListFilter): Promise<Vehicle[]>;
  abstract getById(id: number): Promise<Vehicle>;
  abstract create(input: CreateVehicleInput, actor: ActorContext): Promise<Vehicle>;
  abstract update(id: number, input: UpdateVehicleInput, actor: ActorContext): Promise<Vehicle>;
  abstract delete(id: number, actor: ActorContext): Promise<void>;
}
