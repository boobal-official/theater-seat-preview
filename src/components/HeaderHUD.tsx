"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { MAX_TICKETS, MIN_TICKETS, SHOWTIME } from "@/data/hallConfig";
import type { ViewMode } from "@/types/theater";

interface HeaderHUDProps {
  viewMode: ViewMode;
  ticketCount: number;
  onChangeTicketCount: (next: number) => void;
}

export function HeaderHUD({
  viewMode,
  ticketCount,
  onChangeTicketCount,
}: HeaderHUDProps) {
  const is3D = viewMode === "3d";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 pointer-events-none flex justify-center px-5 sm:px-8 pt-6 sm:pt-8"
      aria-label="Movie showtime header"
    >
      <motion.div
        layout
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`w-full flex items-center justify-between gap-4 transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          is3D ? "max-w-[1440px]" : "max-w-[560px]"
        }`}
      >
        {/* Movie title & metadata */}
        <div className="pointer-events-auto min-w-0">
          <h1 className="text-[18px] sm:text-[21px] font-semibold tracking-[-0.02em] text-white leading-tight truncate drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
            {SHOWTIME.title}
          </h1>
          <p className="mt-0.5 text-[12px] sm:text-[13px] text-[#8E8E96] font-normal tracking-[-0.005em] drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            {SHOWTIME.dateLabel} · {SHOWTIME.timeLabel} · {SHOWTIME.hallLabel}
          </p>
        </div>

        {/* Ticket count pill stepper */}
        <div
          className={`pointer-events-auto shrink-0 flex items-center gap-2 sm:gap-3 rounded-full px-1.5 py-1.5 transition-colors duration-300 ${
            is3D
              ? "hud-glass shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              : "bg-[#18181C] border border-white/[0.09]"
          }`}
          role="group"
          aria-label="Ticket quantity"
        >
          <button
            type="button"
            onClick={() => onChangeTicketCount(Math.max(MIN_TICKETS, ticketCount - 1))}
            disabled={ticketCount <= MIN_TICKETS}
            aria-label="Decrease ticket count"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.07] text-white/90 hover:bg-white/[0.15] active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>

          <span className="min-w-[66px] text-center text-[13px] sm:text-[14px] font-medium text-white tabular-nums tracking-[-0.01em]">
            {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
          </span>

          <button
            type="button"
            onClick={() => onChangeTicketCount(Math.min(MAX_TICKETS, ticketCount + 1))}
            disabled={ticketCount >= MAX_TICKETS}
            aria-label="Increase ticket count"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.07] text-white/90 hover:bg-white/[0.15] active:scale-95 disabled:opacity-35 disabled:pointer-events-none transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </motion.div>
    </header>
  );
}
