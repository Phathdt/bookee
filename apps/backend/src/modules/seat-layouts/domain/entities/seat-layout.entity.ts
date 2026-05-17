export interface Seat {
  id: number;
  layoutId: number;
  code: string;
  floor: number;
  row: number;
  col: number;
}

export interface SeatLayout {
  id: number;
  name: string;
  rows: number;
  cols: number;
}

/** A SeatLayout fetched together with its seats. */
export interface SeatLayoutWithSeats extends SeatLayout {
  seats: Seat[];
}
