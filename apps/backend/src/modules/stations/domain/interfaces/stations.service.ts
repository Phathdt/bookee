import { Station } from '../entities/station.entity';

export interface CreateStationInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
}

export interface UpdateStationInput {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  city?: string;
}

export interface StationSearchFilter {
  city?: string;
  q?: string;
}

export abstract class IStationsService {
  abstract list(filter: StationSearchFilter): Promise<Station[]>;
  abstract getById(id: number): Promise<Station>;
  abstract create(input: CreateStationInput): Promise<Station>;
  abstract update(id: number, input: UpdateStationInput): Promise<Station>;
  abstract delete(id: number): Promise<void>;
}
