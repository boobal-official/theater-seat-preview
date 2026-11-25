export type RowLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type SeatStatus = "free" | "taken";

export type ViewMode = "2d" | "3d";

export interface SeatDefinition {
  id: string; // e.g., "E-5"
  row: RowLetter;
  rowIndex: number; // 0 (A) .. 7 (H)
  col: number; // 1 .. 12
  section: "left" | "right";
  status: SeatStatus;
  /** 3D world-space center of the seat floor base */
  worldPosition: [number, number, number];
  /** 3D world-space seated eye position */
  eyePosition: [number, number, number];
}

export interface MovieShowtime {
  title: string;
  dateLabel: string;
  timeLabel: string;
  hallLabel: string;
  ticketPrice: number;
  currencySymbol: string;
}

export interface SelectedSeatGroup {
  row: RowLetter;
  rowIndex: number;
  seatIds: string[];
  cols: number[];
}
