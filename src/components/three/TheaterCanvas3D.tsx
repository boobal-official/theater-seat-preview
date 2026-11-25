"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { CameraRig } from "@/components/three/CameraRig";
import { CinemaScreen } from "@/components/three/CinemaScreen";
import { TheaterAuditorium } from "@/components/three/TheaterAuditorium";
import type { ViewMode } from "@/types/theater";

interface TheaterCanvas3DProps {
  viewMode: ViewMode;
  show2DOverlay: boolean;
  selectedSeatIds: string[];
  targetEyePosition: [number, number, number];
  reducedMotion: boolean;
  onSettledIn3D: (settled: boolean) => void;
  onShow2DOverlay: (show2D: boolean) => void;
}

export function TheaterCanvas3D({
  viewMode,
  show2DOverlay,
  selectedSeatIds,
  targetEyePosition,
  reducedMotion,
  onSettledIn3D,
  onShow2DOverlay,
}: TheaterCanvas3DProps) {
  const transitionProgressRef = useRef(0);
  const isCanvasVisible = !show2DOverlay || viewMode === "3d";

  return (
    <div
      className={`fixed inset-0 z-10 transition-opacity duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isCanvasVisible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isCanvasVisible}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 36, near: 0.1, far: 80, position: [0, 17.6, 0.8] }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <color attach="background" args={["#050506"]} />
        <fog attach="fog" args={["#050506", 20, 42]} />

        <TheaterAuditorium
          selectedSeatIds={selectedSeatIds}
          transitionProgressRef={transitionProgressRef}
        />
        <CinemaScreen />
        <CameraRig
          viewMode={viewMode}
          targetEyePosition={targetEyePosition}
          reducedMotion={reducedMotion}
          transitionProgressRef={transitionProgressRef}
          onSettledIn3D={onSettledIn3D}
          onShow2DOverlay={onShow2DOverlay}
        />
      </Canvas>

      {/* Subtle bottom gradient vignette kept low so foreground cinema seat headrests stay vividly visible */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        aria-hidden="true"
      />
      {/* Subtle top gradient vignette for top-left movie title & top-right ticket stepper */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-black/65 via-black/25 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
