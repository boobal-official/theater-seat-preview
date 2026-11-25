"use client";

import { CheckCircle2, Ticket, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SHOWTIME } from "@/data/hallConfig";
import { formatPrice, formatSeatRange } from "@/lib/seatSelection";
import type { RowLetter } from "@/types/theater";

interface BookingModalProps {
  open: boolean;
  row: RowLetter;
  cols: number[];
  ticketCount: number;
  onClose: () => void;
}

export function BookingModal({
  open,
  row,
  cols,
  ticketCount,
  onClose,
}: BookingModalProps) {
  const total = ticketCount * SHOWTIME.ticketPrice;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="booking-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div
            key="booking-card"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[400px] rounded-[24px] bg-[#121216] border border-white/[0.12] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmed-title"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close booking summary"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-[#4ADE80] mb-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
                Seats Reserved
              </span>
            </div>

            <h2
              id="booking-confirmed-title"
              className="text-[22px] font-semibold tracking-[-0.02em]"
            >
              {SHOWTIME.title}
            </h2>
            <p className="text-[13px] text-[#8E8E96] mt-0.5">
              {SHOWTIME.dateLabel} · {SHOWTIME.timeLabel} · {SHOWTIME.hallLabel}
            </p>

            {/* Perforated ticket summary */}
            <div className="mt-5 rounded-[16px] bg-[#1A1A20] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#8E8E96]">Row</span>
                <span className="font-semibold text-white">Row {row}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#8E8E96]">
                  {cols.length === 1 ? "Seat" : "Seats"}
                </span>
                <div className="flex items-center gap-1.5">
                  {cols.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center justify-center min-w-[26px] h-[24px] px-1.5 rounded-[6px] bg-[#3B7BF6] text-white text-[12px] font-semibold tabular-nums"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-dashed border-white/[0.12] pt-3 flex items-center justify-between">
                <span className="text-[13px] text-[#8E8E96]">
                  Total ({ticketCount} ×{" "}
                  {formatPrice(SHOWTIME.ticketPrice, SHOWTIME.currencySymbol)})
                </span>
                <span className="text-[16px] font-semibold text-white tabular-nums">
                  {formatPrice(total, SHOWTIME.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Ticket pass footer */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-[#6E6E78] px-1">
              <span className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" />
                Pass #{row}
                {formatSeatRange(cols).replace("–", "")}-H3
              </span>
              <span className="font-mono tracking-[0.18em]">
                ||| || |||| |||
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full h-[46px] rounded-full bg-white hover:bg-[#F0F0F4] text-[#09090B] font-semibold text-[14px] transition cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
