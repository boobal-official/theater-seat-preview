"use client";

import { AnimatePresence, motion } from "motion/react";
import { SHOWTIME } from "@/data/hallConfig";
import { formatPrice, formatSeatRange } from "@/lib/seatSelection";
import type { RowLetter, ViewMode } from "@/types/theater";

interface BookingBarProps {
  viewMode: ViewMode;
  activeRow: RowLetter;
  selectedCols: number[];
  ticketCount: number;
  onToggleViewMode: () => void;
  onOpenBooking: () => void;
}

/** Custom 3D seat-view eye/dome icon matching frames 00:00–00:06 */
function Preview3DIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M2.2 10C3.9 6.6 6.7 5 10 5C13.3 5 16.1 6.6 17.8 10C16.1 13.4 13.3 15 10 15C6.7 15 3.9 13.4 2.2 10Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="10"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.55"
      />
    </svg>
  );
}

/** Custom 3×2 mini seat-grid icon matching frames 00:08–00:21 */
function SeatsGridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect x="2" y="3.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7.25" y="3.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12.5" y="3.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="10.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7.25" y="10.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12.5" y="10.5" width="3.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function BookingBar({
  viewMode,
  activeRow,
  selectedCols,
  ticketCount,
  onToggleViewMode,
  onOpenBooking,
}: BookingBarProps) {
  const is3D = viewMode === "3d";
  const totalPrice = ticketCount * SHOWTIME.ticketPrice;
  const seatWord = selectedCols.length === 1 ? "Seat" : "Seats";

  return (
    <div className="w-full max-w-[520px] mx-auto px-4 sm:px-0 pointer-events-auto">
      {/* Row & unit price summary line */}
      <div className="flex items-center justify-between text-[13px] sm:text-[14px] mb-3 px-1">
        <div className="drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
          <span className="font-semibold text-white">Row {activeRow}</span>
          <span className="text-[#92929C]">
            {" "}
            · {seatWord} {formatSeatRange(selectedCols)}
          </span>
        </div>
        <div className="text-[#92929C] tabular-nums drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
          {ticketCount} × {formatPrice(SHOWTIME.ticketPrice, SHOWTIME.currencySymbol)}
        </div>
      </div>

      {/* Action pill buttons row */}
      <div className="flex items-center gap-3">
        {/* Preview / Seats mode toggle pill */}
        <button
          type="button"
          onClick={onToggleViewMode}
          className={`relative flex-[0.37] h-[50px] sm:h-[52px] rounded-full flex items-center justify-center overflow-hidden font-medium text-[14px] text-white tracking-[-0.01em] transition-all duration-200 active:scale-[0.97] cursor-pointer ${
            is3D
              ? "hud-glass hover:bg-[#222229]/85 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              : "bg-[#141418] border border-white/[0.12] hover:bg-[#1C1C22] hover:border-white/[0.2]"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {is3D ? (
              <motion.span
                key="btn-seats"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <SeatsGridIcon />
                <span>Seats</span>
              </motion.span>
            ) : (
              <motion.span
                key="btn-preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <Preview3DIcon />
                <span>Preview</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Primary White CTA */}
        <button
          type="button"
          onClick={onOpenBooking}
          className="flex-[0.63] h-[50px] sm:h-[52px] rounded-full bg-white hover:bg-[#F2F2F5] active:scale-[0.985] text-[#09090B] font-semibold text-[14px] sm:text-[15px] tracking-[-0.015em] shadow-[0_8px_30px_rgba(0,0,0,0.55)] transition-all duration-150 cursor-pointer tabular-nums"
        >
          Book {ticketCount === 1 ? "seat" : "seats"} ·{" "}
          {formatPrice(totalPrice, SHOWTIME.currencySymbol)}
        </button>
      </div>
    </div>
  );
}
