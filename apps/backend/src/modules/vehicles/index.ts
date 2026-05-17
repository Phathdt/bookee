export { VehiclesModule } from './vehicles.module';
export { VehiclesService } from './application/services/vehicles.service';
export { IVehiclesService } from './domain/interfaces/vehicles.service';
export { IVehiclesRepository } from './domain/interfaces/vehicles.repository';
export type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleListFilter,
} from './domain/interfaces/vehicles.repository';
export type { ActorContext } from './domain/interfaces/vehicles.service';
export type { Vehicle } from './domain/entities/vehicle.entity';
export {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from './domain/errors';
