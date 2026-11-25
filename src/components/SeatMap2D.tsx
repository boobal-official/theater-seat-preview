"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LEFT_COLS,
  RIGHT_COLS,
  ROWS,
  SEAT_BY_ID,
  seatExists,
} from "@/data/hallConfig";
import {
  findBestContiguousSeatsInRow,
  formatSeatRange,
} from "@/lib/seatSelection";
import type { RowLetter } from "@/types/theater";

interface SeatMap2DProps {
  selectedSeatIds: string[];
  ticketCount: number;
  visible: boolean;
  onSelectSeats: (seatIds: string[]) => void;
}

export function SeatMap2D({
  selectedSeatIds,
  ticketCount,
  visible,
  onSelectSeats,
}: SeatMap2DProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const selectedSummary = useMemo(() => {
    const seats = selectedSeatIds
      .map((id) => SEAT_BY_ID.get(id))
      .filter(Boolean);
    if (seats.length === 0) return "";
    const row = seats[0]!.row;
    const cols = seats.map((s) => s!.col).sort((a, b) => a - b);
    return `Row ${row} · ${formatSeatRange(cols)}`;
  }, [selectedSeatIds]);

  // Measure the center-top of the selected seats so the white pill floats directly above them
  const updateTooltipPosition = useCallback(() => {
    const container = gridContainerRef.current;
    if (!container || selectedSeatIds.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let found = 0;

    for (const id of selectedSeatIds) {
      const el = container.querySelector<HTMLElement>(`[data-seat-id="${id}"]`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      maxRight = Math.max(maxRight, rect.right);
      minTop = Math.min(minTop, rect.top);
      found++;
    }

    if (found > 0) {
      setTooltipPos({
        x: (minLeft + maxRight) / 2 - containerRect.left,
        y: minTop - containerRect.top - 12,
      });
    }
  }, [selectedSeatIds]);

  useEffect(() => {
    if (isDragging) {
      updateTooltipPosition();
    }
  }, [isDragging, selectedSeatIds, updateTooltipPosition]);

  const applyTargetSeat = useCallback(
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

  const handlePointerAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const seatTarget = el?.closest<HTMLElement>("[data-row][data-col]");
      if (!seatTarget) return;
      const row = seatTarget.dataset.row as RowLetter | undefined;
      const col = Number(seatTarget.dataset.col);
      if (!row || Number.isNaN(col)) return;
      applyTargetSeat(row, col);
    },
    [applyTargetSeat]
  );

  const handleSeatPointerDown = (
    e: React.PointerEvent,
    row: RowLetter,
    col: number,
    isTaken: boolean
  ) => {
    if (isTaken) return;
    e.preventDefault();
    setIsDragging(true);
    applyTargetSeat(row, col);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      handlePointerAtPoint(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, handlePointerAtPoint]);

  const renderSeatButton = (row: RowLetter, col: number) => {
    if (!seatExists(row, col)) {
      return (
        <div
          key={`${row}-${col}-spacer`}
          className="w-[24px] h-[25px] sm:w-[29px] sm:h-[30px]"
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
        key={id}
        type="button"
        data-seat-id={id}
        data-row={row}
        data-col={col}
        disabled={isTaken}
        onPointerDown={(e) => handleSeatPointerDown(e, row, col, isTaken)}
        aria-label={`Row ${row} Seat ${col}${
          isTaken ? " (Taken)" : isSelected ? " (Selected)" : " (Available)"
        }`}
        aria-pressed={isSelected}
        className={`relative w-[24px] h-[25px] sm:w-[29px] sm:h-[30px] rounded-[6px] sm:rounded-[7px] flex items-center justify-center text-[10px] sm:text-[11px] font-semibold tabular-nums transition-all duration-150 select-none ${
          isTaken
            ? "bg-[#1E1E22] border border-[#26262B] cursor-not-allowed"
            : isSelected
            ? `bg-[#3B7BF6] border border-[#619BFF] text-white shadow-[0_0_16px_rgba(59,123,246,0.48)] z-10 scale-[1.03] ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`
            : `bg-[#0D0D10]/70 border border-[#323239] hover:border-[#62626F] hover:bg-white/[0.05] text-transparent ${
                isDragging ? "cursor-grabbing" : "cursor-pointer"
              }`
        }`}
      >
        {/* Subtle bottom seat-cushion accent bar like cinema seat icons */}
        <span
          className={`pointer-events-none absolute bottom-[2px] left-[4px] right-[4px] h-[2px] rounded-full transition-opacity ${
            isSelected
              ? "bg-white/35 opacity-100"
              : isTaken
              ? "bg-white/[0.04] opacity-100"
              : "bg-white/[0.09] opacity-100"
          }`}
        />
        {isSelected && <span className="relative -top-[1px]">{col}</span>}
      </button>
    );
  };

  return (
    <motion.section
      aria-label="2D theater seat map"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.985,
      }}
      transition={{
        duration: visible ? 0.34 : 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative z-20 w-full max-w-[560px] mx-auto px-4 sm:px-0 flex flex-col items-center ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Curved cinema screen arc + SCREEN label */}
      <div className="w-full max-w-[470px] flex flex-col items-center mb-5 sm:mb-6">
        <svg
          viewBox="0 0 470 22"
          className="w-full h-[18px] overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="screenArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="20%" stopColor="#d4d4dc" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#d4d4dc" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <path
            d="M 8 18 Q 235 1 462 18"
            fill="none"
            stroke="url(#screenArcGrad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="mt-1 text-[9px] sm:text-[10px] font-medium tracking-[0.24em] text-[#56565F] uppercase">
          Screen
        </span>
      </div>

      {/* Interactive 8-row seat grid */}
      <div
        ref={gridContainerRef}
        className={`relative w-full flex flex-col gap-[7px] sm:gap-[9px] items-center touch-none ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        {/* Floating white drag tooltip ("Row F · 7–8", "Row E · 5–6") */}
        <AnimatePresence>
          {isDragging && tooltipPos && selectedSummary && (
            <motion.div
              key="drag-seat-pill"
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: tooltipPos.x,
                y: tooltipPos.y,
              }}
              exit={{ opacity: 0, scale: 0.88, y: 4 }}
              transition={{
                type: "spring",
                stiffness: 460,
                damping: 32,
                opacity: { duration: 0.14 },
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                translateX: "-50%",
                translateY: "-100%",
              }}
              className="pointer-events-none z-40 whitespace-nowrap rounded-full bg-white text-[#0A0A0D] px-3.5 py-1 text-[12px] font-semibold tracking-[-0.01em] shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
            >
              {selectedSummary}
            </motion.div>
          )}
        </AnimatePresence>

        {ROWS.map((row) => (
          <div
            key={row}
            className="flex items-center justify-center gap-2.5 sm:gap-4"
          >
            {/* Left row label */}
            <span className="w-3.5 text-right text-[10px] sm:text-[11px] font-medium text-[#4E4E56] select-none">
              {row}
            </span>

            {/* Left section (cols 1–6) */}
            <div className="flex items-center gap-[5px] sm:gap-[7px]">
              {LEFT_COLS.map((col) => renderSeatButton(row, col))}
            </div>

            {/* Center aisle */}
            <div className="w-5 sm:w-8 shrink-0" aria-hidden="true" />

            {/* Right section (cols 7–12) */}
            <div className="flex items-center gap-[5px] sm:gap-[7px]">
              {RIGHT_COLS.map((col) => renderSeatButton(row, col))}
            </div>

            {/* Right row label */}
            <span className="w-3.5 text-left text-[10px] sm:text-[11px] font-medium text-[#4E4E56] select-none">
              {row}
            </span>
          </div>
        ))}
      </div>

      {/* Legend row (Free, Taken, Yours) */}
      <div
        className="mt-6 sm:mt-7 flex items-center justify-center gap-6 text-[11px] sm:text-[12px] text-[#7D7D86]"
        aria-label="Seat legend"
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] border border-[#3E3E47] bg-transparent inline-block" />
          <span>Free</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[#232328] border border-[#2C2C32] inline-block" />
          <span>Taken</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-[3px] bg-[#3B7BF6] shadow-[0_0_8px_rgba(59,123,246,0.5)] inline-block" />
          <span>Yours</span>
        </div>
      </div>
    </motion.section>
  );
}
