import { Station } from '../../domain/entities/station.entity';
import {
  StationInUseError,
  StationNotFoundError,
  StationValidationError,
} from '../../domain/errors';
import {
  IStationsRepository,
  CreateStationInput,
  UpdateStationInput,
  StationSearchFilter,
} from '../../domain/interfaces/stations.repository';
import { IStationsService } from '../../domain/interfaces/stations.service';

/** WGS84 — see https://epsg.io/4326 */
const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

export class StationsService implements IStationsService {
  constructor(private readonly stations: IStationsRepository) {}

  private assertLatLng(lat: number | undefined, lng: number | undefined): void {
    if (lat !== undefined && (lat < LAT_MIN || lat > LAT_MAX)) {
      throw new StationValidationError(`lat must be in [${LAT_MIN}, ${LAT_MAX}]`);
    }
    if (lng !== undefined && (lng < LNG_MIN || lng > LNG_MAX)) {
      throw new StationValidationError(`lng must be in [${LNG_MIN}, ${LNG_MAX}]`);
    }
  }

  list(filter: StationSearchFilter): Promise<Station[]> {
    return this.stations.list(filter);
  }

  async getById(id: number): Promise<Station> {
    const found = await this.stations.findById(id);
    if (!found) throw new StationNotFoundError();
    return found;
  }

  async create(input: CreateStationInput): Promise<Station> {
    this.assertLatLng(input.lat, input.lng);
    return this.stations.create(input);
  }

  async update(id: number, input: UpdateStationInput): Promise<Station> {
    const existing = await this.stations.findById(id);
    if (!existing) throw new StationNotFoundError();
    this.assertLatLng(input.lat, input.lng);
    return this.stations.update(id, input);
  }

  async delete(id: number): Promise<void> {
    const existing = await this.stations.findById(id);
    if (!existing) throw new StationNotFoundError();
    if (await this.stations.isReferencedByRoute(id)) {
      throw new StationInUseError();
    }
    await this.stations.delete(id);
  }
}
