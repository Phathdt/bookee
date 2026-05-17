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
  /** Diacritic-insensitive substring match on name. */
  q?: string;
}

export abstract class IStationsRepository {
  abstract findById(id: number): Promise<Station | null>;
  abstract list(filter: StationSearchFilter): Promise<Station[]>;
  abstract create(input: CreateStationInput): Promise<Station>;
  abstract update(id: number, input: UpdateStationInput): Promise<Station>;
  abstract delete(id: number): Promise<void>;
  /** True if any Route still references this station as from or to. */
  abstract isReferencedByRoute(id: number): Promise<boolean>;
}
