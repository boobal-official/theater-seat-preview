"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingBar } from "@/components/BookingBar";
import { BookingModal } from "@/components/BookingModal";
import { HeaderHUD } from "@/components/HeaderHUD";
import { MiniSeatMap3D } from "@/components/MiniSeatMap3D";
import { SeatMap2D } from "@/components/SeatMap2D";
import {
  INITIAL_SELECTED_IDS,
  INITIAL_TICKET_COUNT,
} from "@/data/hallConfig";
import {
  findNearestAvailableGroup,
  getSelectionCameraAnchor,
} from "@/lib/seatSelection";
import type { ViewMode } from "@/types/theater";

// Load Three.js Canvas strictly on client to keep SSR clean and fast
const TheaterCanvas3D = dynamic(
  () =>
    import("@/components/three/TheaterCanvas3D").then(
      (m) => m.TheaterCanvas3D
    ),
  { ssr: false }
);

export function TheaterExperience() {
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [show2DOverlay, setShow2DOverlay] = useState(true);
  const [settledIn3D, setSettledIn3D] = useState(false);
  const [ticketCount, setTicketCount] = useState(INITIAL_TICKET_COUNT);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(
    INITIAL_SELECTED_IDS
  );
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion live
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const anchor = useMemo(
    () => getSelectionCameraAnchor(selectedSeatIds),
    [selectedSeatIds]
  );

  // Dynamically resize seat group around current seat whenever user changes ticket stepper
  const handleChangeTicketCount = useCallback(
    (nextCount: number) => {
      setTicketCount(nextCount);
      const midCol =
        anchor.cols.length > 0
          ? Math.round(
              (anchor.cols[0] + anchor.cols[anchor.cols.length - 1]) / 2
            )
          : 6;
      const nextSeats = findNearestAvailableGroup(
        anchor.row,
        midCol,
        nextCount
      );
      if (nextSeats.length > 0) {
        setSelectedSeatIds(nextSeats.map((s) => s.id));
      }
    },
    [anchor]
  );

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      if (prev === "3d") {
        setSettledIn3D(false);
        return "2d";
      }
      setShow2DOverlay(false);
      return "3d";
    });
  }, []);

  // Keyboard shortcut: Esc closes booking modal or returns from 3D to 2D
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bookingOpen) {
          setBookingOpen(false);
        } else if (viewMode === "3d") {
          setSettledIn3D(false);
          setViewMode("2d");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bookingOpen, viewMode]);

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#08080A] flex flex-col justify-between">
      {/* Live 3D Cinema Auditorium Canvas (mounted & aligned behind the 2D seat map) */}
      <TheaterCanvas3D
        viewMode={viewMode}
        show2DOverlay={show2DOverlay}
        selectedSeatIds={selectedSeatIds}
        targetEyePosition={anchor.eyePosition}
        reducedMotion={reducedMotion}
        onSettledIn3D={setSettledIn3D}
        onShow2DOverlay={setShow2DOverlay}
      />

      {/* Morphing Top Header (narrow centered in 2D <-> full-viewport corners in 3D) */}
      <HeaderHUD
        viewMode={viewMode}
        ticketCount={ticketCount}
        onChangeTicketCount={handleChangeTicketCount}
      />

      {/* Center Stage: 2D Interactive Seat Map */}
      <div className="relative z-20 flex-1 flex items-center justify-center pt-20 pb-4 pointer-events-none">
        <SeatMap2D
          selectedSeatIds={selectedSeatIds}
          ticketCount={ticketCount}
          visible={show2DOverlay}
          onSelectSeats={setSelectedSeatIds}
        />
      </div>

      {/* Bottom Floating HUD: 3D Mini Seat-Map Switcher + Booking Bar */}
      <footer className="relative z-30 pb-6 sm:pb-8 pointer-events-none flex flex-col items-center">
        <MiniSeatMap3D
          visible={viewMode === "3d" && settledIn3D}
          activeRow={anchor.row}
          selectedSeatIds={selectedSeatIds}
          ticketCount={ticketCount}
          onSelectSeats={setSelectedSeatIds}
        />

        <BookingBar
          viewMode={viewMode}
          activeRow={anchor.row}
          selectedCols={anchor.cols}
          ticketCount={ticketCount}
          onToggleViewMode={handleToggleViewMode}
          onOpenBooking={() => setBookingOpen(true)}
        />
      </footer>

      {/* Ticket Confirmation Modal */}
      <BookingModal
        open={bookingOpen}
        row={anchor.row}
        cols={anchor.cols}
        ticketCount={ticketCount}
        onClose={() => setBookingOpen(false)}
      />
    </main>
  );
}
