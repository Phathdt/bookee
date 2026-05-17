import { TripStatus } from '../enums';

export interface Trip {
  id: number;
  routeId: number;
  vehicleId: number;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  status: TripStatus;
}
