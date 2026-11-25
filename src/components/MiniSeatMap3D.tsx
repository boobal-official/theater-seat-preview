"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LEFT_COLS,
  RIGHT_COLS,
  ROWS,
  SEAT_BY_ID,
  seatExists,
} from "@/data/hallConfig";
import { findBestContiguousSeatsInRow } from "@/lib/seatSelection";
import type { RowLetter } from "@/types/theater";

interface MiniSeatMap3DProps {
  visible: boolean;
  activeRow: RowLetter;
  selectedSeatIds: string[];
  ticketCount: number;
  onSelectSeats: (seatIds: string[]) => void;
}

const ROW_PITCH_PX = 25; // compact vertical spacing per mini row

export function MiniSeatMap3D({
  visible,
  activeRow,
  selectedSeatIds,
  ticketCount,
  onSelectSeats,
}: MiniSeatMap3DProps) {
  const [isDragging, setIsDragging] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const activeRowIndex = ROWS.indexOf(activeRow);

  const selectAt = useCallback(
    (row: RowLetter, col: number) => {
      const group = findBestContiguousSeatsInRow(row, col, ticketCount);
      if (!group || group.length === 0) return;
      const nextIds = group.map((s) => s.id);
      if (
        nextIds.length === selectedSeatIds.length &&
        nextIds.every((id, i) => id === selectedSeatIds[i])
      ) {
        return;
      }
      onSelectSeats(nextIds);
    },
    [ticketCount, selectedSeatIds, onSelectSeats]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest<HTMLElement>("[data-mini-row][data-mini-col]");
      if (!target) return;
      const row = target.dataset.miniRow as RowLetter | undefined;
      const col = Number(target.dataset.miniCol);
      if (!row || Number.isNaN(col)) return;
      selectAt(row, col);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, selectAt]);

  // Translate vertical strip so activeRow always sits centered in the 3.5-row faded viewport
  const centerOffsetY = 42 - activeRowIndex * ROW_PITCH_PX;

  const renderMiniSeat = (row: RowLetter, col: number, isActiveRow: boolean) => {
    if (!seatExists(row, col)) {
      return (
        <div
          key={`mini-${row}-${col}-gap`}
          className="w-[17px] h-[18px] sm:w-[20px] sm:h-[21px]"
          aria-hidden="true"
        />
      );
    }

    const id = `${row}-${col}`;
    const seat = SEAT_BY_ID.get(id)!;
    const isTaken = seat.status === "taken";
    const isSelected = selectedSet.has(id);

    return (
      <button
        key={`mini-${id}`}
        type="button"
        data-mini-row={row}
        data-mini-col={col}
        disabled={isTaken}
        onPointerDown={(e) => {
          if (isTaken) return;
          e.stopPropagation();
          e.preventDefault();
          setIsDragging(true);
          selectAt(row, col);
        }}
        aria-label={`Jump to Row ${row} Seat ${col}`}
        className={`w-[17px] h-[18px] sm:w-[20px] sm:h-[21px] rounded-[4px] sm:rounded-[5px] flex items-center justify-center text-[9px] font-semibold tabular-nums transition-all duration-150 ${
          isTaken
            ? "bg-white/[0.10] border border-white/[0.06] cursor-not-allowed"
            : isSelected
            ? "bg-[#3B7BF6] border border-[#6EA5FF] text-white shadow-[0_0_12px_rgba(59,123,246,0.65)] scale-[1.05] cursor-grab"
            : isActiveRow
            ? "bg-black/45 border border-white/45 hover:border-white/85 hover:bg-white/15 cursor-pointer"
            : "bg-black/30 border border-white/25 hover:border-white/60 cursor-pointer"
        }`}
      >
        {isSelected ? col : null}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mini-seat-map-3d"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-[390px] mx-auto mb-3 select-none"
          aria-label="Quick 3D seat switcher"
        >
          {/* Faded vertical viewport showing active row in crisp focus + neighboring rows fading out */}
          <div className="minimap-vertical-mask relative h-[96px] overflow-hidden">
            <motion.div
              animate={{ y: centerOffsetY }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="flex flex-col items-center gap-[5px]"
            >
              {ROWS.map((row, idx) => {
                const isActive = row === activeRow;
                const dist = Math.abs(idx - activeRowIndex);
                return (
                  <div
                    key={`mini-row-${row}`}
                    style={{
                      opacity: dist === 0 ? 1 : dist === 1 ? 0.52 : 0.25,
                      transform:
                        dist === 0
                          ? "scale(1)"
                          : dist === 1
                          ? "scale(0.95)"
                          : "scale(0.9)",
                    }}
                    className="flex items-center justify-center gap-2 transition-[opacity,transform] duration-200"
                  >
                    <span
                      className={`w-3 text-right text-[9px] font-semibold transition-opacity ${
                        isActive ? "text-white/85 opacity-100" : "opacity-0"
                      }`}
                    >
                      {row}
                    </span>

                    <div className="flex items-center gap-[4px]">
                      {LEFT_COLS.map((col) => renderMiniSeat(row, col, isActive))}
                    </div>

                    <div className="w-3.5 sm:w-4 shrink-0" aria-hidden="true" />

                    <div className="flex items-center gap-[4px]">
                      {RIGHT_COLS.map((col) => renderMiniSeat(row, col, isActive))}
                    </div>

                    <span
                      className={`w-3 text-left text-[9px] font-semibold transition-opacity ${
                        isActive ? "text-white/85 opacity-100" : "opacity-0"
                      }`}
                    >
                      {row}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
