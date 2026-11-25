import {
  ROWS,
  SEAT_BY_ID,
  SEATS_BY_ROW,
} from "@/data/hallConfig";
import type { RowLetter, SeatDefinition } from "@/types/theater";

/**
 * Finds the best contiguous run of `count` free seats within the same section
 * (never straddling the center aisle) in `row`, anchored as close as possible to `targetCol`.
 */
export function findBestContiguousSeatsInRow(
  row: RowLetter,
  targetCol: number,
  count: number
): SeatDefinition[] | null {
  const rowSeats = SEATS_BY_ROW[row];
  if (!rowSeats || count <= 0) return null;

  // Build all valid contiguous blocks within the left or right section
  const candidates: SeatDefinition[][] = [];
  for (let i = 0; i <= rowSeats.length - count; i++) {
    const slice = rowSeats.slice(i, i + count);
    const allFree = slice.every((s) => s.status === "free");
    if (!allFree) continue;

    const sameSection = slice.every((s) => s.section === slice[0].section);
    if (!sameSection) continue;

    // Ensure consecutive column numbers
    let consecutive = true;
    for (let k = 1; k < slice.length; k++) {
      if (slice[k].col !== slice[k - 1].col + 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      candidates.push(slice);
    }
  }

  if (candidates.length === 0) return null;

  // Prefer the candidate whose center (or anchor) is closest to targetCol
  const desiredStart = targetCol - Math.floor((count - 1) / 2);
  candidates.sort((a, b) => {
    const distA = Math.abs(a[0].col - desiredStart);
    const distB = Math.abs(b[0].col - desiredStart);
    if (distA !== distB) return distA - distB;
    const centerA = (a[0].col + a[a.length - 1].col) / 2;
    const centerB = (b[0].col + b[b.length - 1].col) / 2;
    return Math.abs(centerA - targetCol) - Math.abs(centerB - targetCol);
  });

  return candidates[0];
}

/**
 * Finds the best contiguous run of `count` free seats across the whole hall,
 * searching closest to the preferred (row, col).
 */
export function findNearestAvailableGroup(
  preferredRow: RowLetter,
  preferredCol: number,
  count: number
): SeatDefinition[] {
  const direct = findBestContiguousSeatsInRow(preferredRow, preferredCol, count);
  if (direct) return direct;

  const prefRowIdx = ROWS.indexOf(preferredRow);
  const sortedRows = [...ROWS].sort(
    (a, b) =>
      Math.abs(ROWS.indexOf(a) - prefRowIdx) -
      Math.abs(ROWS.indexOf(b) - prefRowIdx)
  );

  for (const row of sortedRows) {
    const match = findBestContiguousSeatsInRow(row, preferredCol, count);
    if (match) return match;
  }

  // Fallback: pick any `count` free seats in order
  const fallback: SeatDefinition[] = [];
  for (const row of sortedRows) {
    for (const seat of SEATS_BY_ROW[row]) {
      if (seat.status === "free") {
        fallback.push(seat);
        if (fallback.length === count) return fallback;
      }
    }
  }
  return fallback;
}

/**
 * Computes the average 3D eye position across all selected seats (so a 2-seat pair
 * centers the camera naturally between seats 5 and 6, just like the video!).
 */
export function getSelectionCameraAnchor(
  selectedSeatIds: string[]
): {
  eyePosition: [number, number, number];
  row: RowLetter;
  rowIndex: number;
  cols: number[];
} {
  const seats = selectedSeatIds
    .map((id) => SEAT_BY_ID.get(id))
    .filter((s): s is SeatDefinition => Boolean(s));

  if (seats.length === 0) {
    const fallback = SEAT_BY_ID.get("E-5")!;
    return {
      eyePosition: fallback.eyePosition,
      row: fallback.row,
      rowIndex: fallback.rowIndex,
      cols: [fallback.col],
    };
  }

  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const seat of seats) {
    sx += seat.eyePosition[0];
    sy += seat.eyePosition[1];
    sz += seat.eyePosition[2];
  }
  const n = seats.length;
  const cols = seats.map((s) => s.col).sort((a, b) => a - b);

  return {
    eyePosition: [sx / n, sy / n, sz / n],
    row: seats[0].row,
    rowIndex: seats[0].rowIndex,
    cols,
  };
}

/** Formats seat columns cleanly: [5, 6] -> "5–6", [9] -> "9", [5, 6, 7] -> "5–7" */
export function formatSeatRange(cols: number[]): string {
  if (cols.length === 0) return "";
  const sorted = [...cols].sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]}`;

  const isContiguous = sorted.every(
    (col, i) => i === 0 || col === sorted[i - 1] + 1
  );
  if (isContiguous) {
    return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  }
  return sorted.join(", ");
}

export function formatPrice(amount: number, currency = "€"): string {
  return `${currency}${amount.toFixed(2)}`;
}
