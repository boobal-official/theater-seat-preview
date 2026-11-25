"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOWL_CENTER, HALL_DIMENSIONS } from "@/data/hallConfig";
import type { ViewMode } from "@/types/theater";

interface CameraRigProps {
  viewMode: ViewMode;
  targetEyePosition: [number, number, number];
  reducedMotion: boolean;
  transitionProgressRef: React.MutableRefObject<number>;
  onSettledIn3D: (settled: boolean) => void;
  onShow2DOverlay: (show2D: boolean) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const OVERHEAD_POS = new THREE.Vector3(0, 17.2, BOWL_CENTER[2] + 0.55);
const OVERHEAD_TARGET = new THREE.Vector3(
  0,
  BOWL_CENTER[1],
  BOWL_CENTER[2] - 0.95
);
const SCREEN_CENTER = new THREE.Vector3(
  0,
  HALL_DIMENSIONS.screenY,
  HALL_DIMENSIONS.screenZ
);

const MAX_YAW = 1.32; // ~±76° left/right so users see full vertical LED walls, speakers & adjacent seats
const MIN_PITCH = -0.34;
const MAX_PITCH = 0.40;

export function CameraRig({
  viewMode,
  targetEyePosition,
  reducedMotion,
  transitionProgressRef,
  onSettledIn3D,
  onShow2DOverlay,
}: CameraRigProps) {
  const { camera, gl, size } = useThree();

  // Animated state refs (never triggers React re-renders per frame)
  const smoothEyePos = useRef(new THREE.Vector3(...targetEyePosition));
  const goalEyePos = useRef(new THREE.Vector3(...targetEyePosition));
  const controlPoint = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3().copy(OVERHEAD_POS));
  const currentTarget = useRef(new THREE.Vector3().copy(OVERHEAD_TARGET));
  const lookDir = useRef(new THREE.Vector3());
  const baseForward = useRef(new THREE.Vector3());
  const eulerHelper = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  // Drag look-around state
  const isPointerDown = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const settledFlag = useRef(false);
  const show2DFlag = useRef(true);

  // When user switches seats in 3D, smoothly glide to the new eye position & recenter gaze toward screen
  useEffect(() => {
    goalEyePos.current.set(
      targetEyePosition[0],
      targetEyePosition[1],
      targetEyePosition[2]
    );
    targetYaw.current = 0;
    targetPitch.current = 0;
  }, [targetEyePosition]);

  // Reset look-around offsets when exiting 3D back to 2D
  useEffect(() => {
    if (viewMode === "2d") {
      targetYaw.current = 0;
      targetPitch.current = 0;
      isPointerDown.current = false;
    }
  }, [viewMode]);

  // Pointer drag look-around listeners directly on the WebGL canvas
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (viewMode !== "3d" || transitionProgressRef.current < 0.78) return;
      isPointerDown.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture?.(e.pointerId);
      dom.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      // Matches video drag direction (00:13–00:18: drag right -> look left toward left LED wall)
      const sensitivity = 0.0044;
      targetYaw.current = THREE.MathUtils.clamp(
        targetYaw.current + dx * sensitivity,
        -MAX_YAW,
        MAX_YAW
      );
      targetPitch.current = THREE.MathUtils.clamp(
        targetPitch.current + dy * sensitivity * 0.75,
        MIN_PITCH,
        MAX_PITCH
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      isPointerDown.current = false;
      dom.releasePointerCapture?.(e.pointerId);
      dom.style.cursor = viewMode === "3d" ? "grab" : "default";
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [gl, viewMode, transitionProgressRef]);

  // Update grab cursor hint when entering/exiting 3D
  useEffect(() => {
    gl.domElement.style.cursor = viewMode === "3d" ? "grab" : "default";
  }, [gl, viewMode]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const persp = camera as THREE.PerspectiveCamera;

    // 1. Advance 2D <-> 3D camera transition progress (interruptible at any point)
    const goalProgress = viewMode === "3d" ? 1 : 0;
    const duration = viewMode === "3d" ? 1.25 : 0.98; // exit ~20% snappier
    if (reducedMotion) {
      transitionProgressRef.current = goalProgress;
    } else {
      const step = delta / duration;
      if (transitionProgressRef.current < goalProgress) {
        transitionProgressRef.current = Math.min(
          goalProgress,
          transitionProgressRef.current + step
        );
      } else if (transitionProgressRef.current > goalProgress) {
        transitionProgressRef.current = Math.max(
          goalProgress,
          transitionProgressRef.current - step
        );
      }
    }

    const p = transitionProgressRef.current;
    const isNowSettled = viewMode === "3d" && p >= 0.93;
    if (isNowSettled !== settledFlag.current) {
      settledFlag.current = isNowSettled;
      onSettledIn3D(isNowSettled);
    }

    // Keep 3D canvas visible throughout the entire 3D -> 2D overhead ascent (00:21–00:24)
    // and dissolve back to 2D only once the camera arrives overhead (p <= 0.16)
    const shouldShow2D = viewMode === "2d" && p <= 0.16;
    if (shouldShow2D !== show2DFlag.current) {
      show2DFlag.current = shouldShow2D;
      onShow2DOverlay(shouldShow2D);
    }

    // 2. Smooth seat-to-seat eye position glide
    const seatDamp = 1 - Math.exp(-7.5 * delta);
    smoothEyePos.current.lerp(goalEyePos.current, seatDamp);

    // 3. Damped inertia for drag look-around yaw & pitch
    const lookDamp = 1 - Math.exp(-10 * delta);
    currentYaw.current = THREE.MathUtils.lerp(
      currentYaw.current,
      targetYaw.current,
      lookDamp
    );
    currentPitch.current = THREE.MathUtils.lerp(
      currentPitch.current,
      targetPitch.current,
      lookDamp
    );

    // 4. Curved Bezier dive from Overhead -> First-Person Seat Eye Level
    const eased = easeInOutCubic(p);

    // Control point arcs gently over the back rows into the seat without clipping risers
    controlPoint.current.set(
      smoothEyePos.current.x * 0.48,
      9.4,
      smoothEyePos.current.z + 3.4
    );

    const inv = 1 - eased;
    currentPos.current
      .copy(OVERHEAD_POS)
      .multiplyScalar(inv * inv)
      .addScaledVector(controlPoint.current, 2 * inv * eased)
      .addScaledVector(smoothEyePos.current, eased * eased);

    // Compute seat-aware gaze target: aimed slightly below screen midline so the user sees
    // the full cinema context (foreground headrests of rows ahead + stage apron + LED walls + screen)
    // while Row A naturally looks up at the towering screen and Row H looks down over all 7 rows!
    const distToScreen = Math.max(
      4.5,
      smoothEyePos.current.z - HALL_DIMENSIONS.screenZ
    );
    // Closer rows (Row A/B) tilt up toward screen center; middle/back rows keep relaxed posture
    // framing both the screen AND the foreground seating rows clearly in view (matching 00:10–00:12)
    const verticalFocusOffset = THREE.MathUtils.lerp(
      -0.18,
      -0.88,
      THREE.MathUtils.clamp((distToScreen - 6.0) / 8.5, 0, 1)
    );
    baseForward.current
      .set(
        SCREEN_CENTER.x,
        SCREEN_CENTER.y + verticalFocusOffset,
        SCREEN_CENTER.z
      )
      .sub(smoothEyePos.current)
      .normalize();

    const baseYaw = Math.atan2(-baseForward.current.x, -baseForward.current.z);
    const basePitch = Math.asin(
      THREE.MathUtils.clamp(baseForward.current.y, -0.95, 0.95)
    );

    const lookInfluence = THREE.MathUtils.smoothstep(p, 0.65, 1.0);
    eulerHelper.current.set(
      basePitch + currentPitch.current * lookInfluence,
      baseYaw + currentYaw.current * lookInfluence,
      0,
      "YXZ"
    );
    lookDir.current.set(0, 0, -1).applyEuler(eulerHelper.current);

    const seatLookTarget = lookDir.current
      .multiplyScalar(12)
      .add(smoothEyePos.current);

    currentTarget.current.lerpVectors(OVERHEAD_TARGET, seatLookTarget, eased);

    // 5. Adaptive cinematic FOV: wide enough (54°–62° vertical) so foreground seat headrests,
    // stage apron, side warm LED walls, AND full widescreen cinema display are all framed together!
    const aspect = size.width / Math.max(1, size.height);
    const seatedFov = THREE.MathUtils.clamp(
      60 / Math.pow(Math.max(aspect, 0.8), 0.14),
      54,
      62
    );
    const overheadFov = THREE.MathUtils.clamp(
      36 / Math.pow(Math.max(aspect, 0.75), 0.12),
      32,
      40
    );
    const nextFov = THREE.MathUtils.lerp(overheadFov, seatedFov, eased);

    if (Math.abs(persp.fov - nextFov) > 0.01) {
      persp.fov = nextFov;
      persp.updateProjectionMatrix();
    }

    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);
  });

  return null;
}
