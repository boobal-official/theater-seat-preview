import type { MovieShowtime, RowLetter, SeatDefinition } from "@/types/theater";

export const SHOWTIME: MovieShowtime = {
  title: "Avengers: Doomsday",
  dateLabel: "Fri 18 Dec",
  timeLabel: "20:30",
  hallLabel: "Hall 3",
  ticketPrice: 12,
  currencySymbol: "€",
};

export const ROWS: RowLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const LEFT_COLS = [1, 2, 3, 4, 5, 6] as const;
export const RIGHT_COLS = [7, 8, 9, 10, 11, 12] as const;
export const ALL_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const MIN_TICKETS = 1;
export const MAX_TICKETS = 6;

/** Single source of truth for 3D theater geometry so 2D overhead and 3D seats match 1-to-1 */
export const HALL_DIMENSIONS = {
  width: 13.6,
  height: 8.4,
  screenZ: -10.2,
  screenY: 3.55,
  screenWidth: 10.8,
  screenHeight: 4.56,
  stageDepth: 2.8,
  stageHeight: 0.44,
  seatStepX: 0.78,
  aisleHalfGap: 0.88,
  rowStartZ: -4.25,
  rowStepZ: 1.18,
  rowStepY: 0.28,
  eyeHeightAboveFloor: 1.18,
  backWallZ: 5.9,
} as const;

/** Pre-occupied seats modeled after the reference video's layout (00:00) */
const TAKEN_SEAT_IDS = new Set<string>([
  // Row A
  "A-4",
  "A-8",
  // Row B
  "B-2",
  "B-3",
  "B-10",
  "B-11",
  // Row C
  "C-4",
  "C-5",
  "C-8",
  "C-9",
  // Row D
  "D-1",
  "D-2",
  "D-10",
  // Row E (keeps 5–6 open for the video's signature selection)
  "E-2",
  "E-3",
  "E-9",
  "E-10",
  // Row F (keeps 7–8 open for drag across aisle)
  "F-4",
  "F-11",
  "F-12",
  // Row G (keeps 9–10 open for initial default selection)
  "G-3",
  "G-4",
  // Row H
  "H-5",
  "H-6",
  "H-8",
]);

export function seatExists(row: RowLetter, col: number): boolean {
  if (row === "A" || row === "H") {
    return col >= 2 && col <= 11;
  }
  return col >= 1 && col <= 12;
}

export function getSeatWorldPosition(
  rowIndex: number,
  col: number
): [number, number, number] {
  const x =
    col <= 6
      ? -HALL_DIMENSIONS.aisleHalfGap - (6 - col) * HALL_DIMENSIONS.seatStepX
      : HALL_DIMENSIONS.aisleHalfGap + (col - 7) * HALL_DIMENSIONS.seatStepX;
  const y = rowIndex * HALL_DIMENSIONS.rowStepY;
  const z = HALL_DIMENSIONS.rowStartZ + rowIndex * HALL_DIMENSIONS.rowStepZ;
  return [x, y, z];
}

export function buildHallSeats(): SeatDefinition[] {
  const seats: SeatDefinition[] = [];
  ROWS.forEach((row, rowIndex) => {
    for (const col of ALL_COLS) {
      if (!seatExists(row, col)) continue;
      const id = `${row}-${col}`;
      const worldPosition = getSeatWorldPosition(rowIndex, col);
      // Positioned naturally forward of the backrest (right over the seat cushion)
      // so foreground rows, armrests, stage apron, LED walls, and screen are all in view
      const eyePosition: [number, number, number] = [
        worldPosition[0],
        worldPosition[1] + HALL_DIMENSIONS.eyeHeightAboveFloor,
        worldPosition[2] - 0.06,
      ];
      seats.push({
        id,
        row,
        rowIndex,
        col,
        section: col <= 6 ? "left" : "right",
        status: TAKEN_SEAT_IDS.has(id) ? "taken" : "free",
        worldPosition,
        eyePosition,
      });
    }
  });
  return seats;
}

export const HALL_SEATS: SeatDefinition[] = buildHallSeats();

export const SEAT_BY_ID: Map<string, SeatDefinition> = new Map(
  HALL_SEATS.map((s) => [s.id, s])
);

export const SEATS_BY_ROW: Record<RowLetter, SeatDefinition[]> = ROWS.reduce(
  (acc, row) => {
    acc[row] = HALL_SEATS.filter((s) => s.row === row);
    return acc;
  },
  {} as Record<RowLetter, SeatDefinition[]>
);

/** Center of the seating bowl in 3D space (used for top-down overhead alignment) */
export const BOWL_CENTER: [number, number, number] = [
  0,
  ((ROWS.length - 1) * HALL_DIMENSIONS.rowStepY) / 2,
  HALL_DIMENSIONS.rowStartZ + ((ROWS.length - 1) * HALL_DIMENSIONS.rowStepZ) / 2,
];

/** Initial selection matches video frame 00:00 -> Row G · Seats 9–10 */
export const INITIAL_TICKET_COUNT = 2;
export const INITIAL_SELECTED_IDS = ["G-9", "G-10"];
