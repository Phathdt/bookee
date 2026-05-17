import { Vehicle } from '../../domain/entities/vehicle.entity';
import {
  VehicleForbiddenError,
  VehicleInUseError,
  VehicleNotFoundError,
  VehiclePlateConflictError,
  VehicleValidationError,
} from '../../domain/errors';
import {
  CreateVehicleInput,
  IVehiclesRepository,
  UpdateVehicleInput,
  VehicleListFilter,
} from '../../domain/interfaces/vehicles.repository';
import { ActorContext, IVehiclesService } from '../../domain/interfaces/vehicles.service';

import { ISeatLayoutsRepository } from '@/modules/seat-layouts/domain/interfaces/seat-layouts.repository';

export class VehiclesService implements IVehiclesService {
  constructor(
    private readonly vehicles: IVehiclesRepository,
    private readonly seatLayouts: ISeatLayoutsRepository,
  ) {}

  private assertOperatorScope(vehicleCompanyId: number, actor: ActorContext): void {
    if (actor.actorOperatorId !== null && actor.actorOperatorId !== vehicleCompanyId) {
      throw new VehicleForbiddenError();
    }
  }

  private async assertPlateUnique(plateNumber: string, excludeId?: number): Promise<void> {
    const existing = await this.vehicles.findByPlateNumber(plateNumber);
    if (existing && existing.id !== excludeId) {
      throw new VehiclePlateConflictError();
    }
  }

  private async assertSeatCountMatchesLayout(
    seatLayoutId: number,
    totalSeats: number,
  ): Promise<void> {
    const layout = await this.seatLayouts.findById(seatLayoutId);
    if (!layout) {
      throw new VehicleValidationError(`Seat layout ${seatLayoutId} not found`);
    }
    if (layout.seats.length !== totalSeats) {
      throw new VehicleValidationError(
        `totalSeats (${totalSeats}) must equal the number of seats in layout ${seatLayoutId} (${layout.seats.length})`,
      );
    }
  }

  list(filter: VehicleListFilter): Promise<Vehicle[]> {
    return this.vehicles.list(filter);
  }

  async getById(id: number): Promise<Vehicle> {
    const found = await this.vehicles.findById(id);
    if (!found) throw new VehicleNotFoundError();
    return found;
  }

  async create(input: CreateVehicleInput, actor: ActorContext): Promise<Vehicle> {
    this.assertOperatorScope(input.companyId, actor);
    await this.assertPlateUnique(input.plateNumber);
    await this.assertSeatCountMatchesLayout(input.seatLayoutId, input.totalSeats);
    return this.vehicles.create(input);
  }

  async update(id: number, input: UpdateVehicleInput, actor: ActorContext): Promise<Vehicle> {
    const existing = await this.vehicles.findById(id);
    if (!existing) throw new VehicleNotFoundError();
    this.assertOperatorScope(existing.companyId, actor);

    if (input.plateNumber !== undefined) {
      await this.assertPlateUnique(input.plateNumber, id);
    }

    // Validate seat count if either seatLayoutId or totalSeats is being updated
    const newSeatLayoutId = input.seatLayoutId ?? existing.seatLayoutId;
    const newTotalSeats = input.totalSeats ?? existing.totalSeats;
    if (input.seatLayoutId !== undefined || input.totalSeats !== undefined) {
      await this.assertSeatCountMatchesLayout(newSeatLayoutId, newTotalSeats);
    }

    return this.vehicles.update(id, input);
  }

  async delete(id: number, actor: ActorContext): Promise<void> {
    const existing = await this.vehicles.findById(id);
    if (!existing) throw new VehicleNotFoundError();
    this.assertOperatorScope(existing.companyId, actor);
    if (await this.vehicles.hasActiveTrips(id)) {
      throw new VehicleInUseError();
    }
    await this.vehicles.delete(id);
  }
}
