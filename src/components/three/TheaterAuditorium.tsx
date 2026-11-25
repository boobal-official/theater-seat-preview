"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HALL_DIMENSIONS, HALL_SEATS, ROWS } from "@/data/hallConfig";

interface TheaterAuditoriumProps {
  selectedSeatIds: string[];
  transitionProgressRef: React.MutableRefObject<number>;
}

/** Creates a soft horizontal Gaussian warm glow texture for the architectural vertical wall LEDs */
function createVerticalGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, "rgba(255, 224, 170, 0)");
  grad.addColorStop(0.28, "rgba(255, 228, 178, 0.16)");
  grad.addColorStop(0.5, "rgba(255, 240, 208, 0.65)");
  grad.addColorStop(0.72, "rgba(255, 228, 178, 0.16)");
  grad.addColorStop(1, "rgba(255, 224, 170, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an ergonomic curved plush cinema seat backrest shape (extruded profile)
 * with tall rounded pillowed shoulders matching frames 00:10–00:18.
 */
function createBackrestGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = 0.31; // half-width (0.62m wide)
  const h = 0.80; // lush high-back headrest height
  const r = 0.16; // soft rounded cinema headrest shoulder curve

  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-(w - r), h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.036,
    bevelSegments: 5,
  });
  geo.center();
  return geo;
}

export function TheaterAuditorium({
  selectedSeatIds,
  transitionProgressRef,
}: TheaterAuditoriumProps) {
  const backrestRef = useRef<THREE.InstancedMesh>(null);
  const cushionRef = useRef<THREE.InstancedMesh>(null);
  const armrestLeftRef = useRef<THREE.InstancedMesh>(null);
  const armrestRightRef = useRef<THREE.InstancedMesh>(null);
  const pedestalRef = useRef<THREE.InstancedMesh>(null);
  const selectedHighlightGroupRef = useRef<THREE.Group>(null);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const backrestGeo = useMemo(() => createBackrestGeometry(), []);
  const glowTexture = useMemo(() => createVerticalGlowTexture(), []);

  useEffect(() => {
    return () => {
      backrestGeo.dispose();
      glowTexture.dispose();
    };
  }, [backrestGeo, glowTexture]);

  // Populate all 92 physical seats into InstancedMeshes with exact world coordinates & per-seat colors
  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const freeColor = new THREE.Color("#2c2c33");
    const takenColor = new THREE.Color("#212127");
    const selectedColor = new THREE.Color("#3b7bf6");
    const cushionSelectedColor = new THREE.Color("#2963dc");
    const armColor = new THREE.Color("#1f1f25");

    HALL_SEATS.forEach((seat, idx) => {
      const [x, y, z] = seat.worldPosition;
      const isSelected = selectedSet.has(seat.id);
      const isTaken = seat.status === "taken";

      // Tall sculpted cinema backrest (top reaches y + 1.16m so rows ahead frame the bottom quarter cleanly!)
      dummy.position.set(x, y + 0.73, z + 0.19);
      dummy.rotation.set(0.14, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      backrestRef.current?.setMatrixAt(idx, dummy.matrix);

      color.copy(isSelected ? selectedColor : isTaken ? takenColor : freeColor);
      backrestRef.current?.setColorAt(idx, color);

      // Plush seat cushion pan
      dummy.position.set(x, y + 0.36, z - 0.06);
      dummy.rotation.set(-0.06, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cushionRef.current?.setMatrixAt(idx, dummy.matrix);

      color.copy(
        isSelected ? cushionSelectedColor : isTaken ? takenColor : freeColor
      );
      cushionRef.current?.setColorAt(idx, color);

      // Left & right padded armrests
      dummy.position.set(x - 0.35, y + 0.53, z - 0.02);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      armrestLeftRef.current?.setMatrixAt(idx, dummy.matrix);
      armrestLeftRef.current?.setColorAt(idx, armColor);

      dummy.position.set(x + 0.35, y + 0.53, z - 0.02);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      armrestRightRef.current?.setMatrixAt(idx, dummy.matrix);
      armrestRightRef.current?.setColorAt(idx, armColor);

      // Floor pedestal base
      dummy.position.set(x, y + 0.16, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      pedestalRef.current?.setMatrixAt(idx, dummy.matrix);
    });

    const meshes = [
      backrestRef.current,
      cushionRef.current,
      armrestLeftRef.current,
      armrestRightRef.current,
      pedestalRef.current,
    ];
    for (const m of meshes) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [selectedSet]);

  // Hide glowing blue overhead seat highlights once camera is seated in 3D (so your own seat
  // never causes blue glare in first-person view, while glowing vividly during overhead dive!)
  useFrame(() => {
    if (!selectedHighlightGroupRef.current) return;
    selectedHighlightGroupRef.current.visible =
      transitionProgressRef.current < 0.72;
  });

  // Compute positions for the architectural vertical warm LED strips along both side walls
  const wallStripZs = useMemo(() => {
    const zs: number[] = [];
    for (let z = -9.9; z <= 5.9; z += 0.56) {
      zs.push(Number(z.toFixed(2)));
    }
    return zs;
  }, []);

  // Wall-mounted surround sound speakers (4 per side wall, visible during left/right look-around)
  const speakerZs = useMemo(() => [-5.6, -2.0, 1.5, 4.7], []);

  const halfW = HALL_DIMENSIONS.width / 2;
  const wallH = HALL_DIMENSIONS.height;
  const totalDepth = HALL_DIMENSIONS.backWallZ - HALL_DIMENSIONS.screenZ;
  const hallMidZ = (HALL_DIMENSIONS.backWallZ + HALL_DIMENSIONS.screenZ) / 2;

  return (
    <group>
      {/* Subtle ambient & warm auditorium fill lighting */}
      <ambientLight intensity={0.28} color="#d8cbb8" />
      <hemisphereLight args={["#2a2622", "#0b0b0d", 0.55]} />

      {/* Warm side-wall grazing bounce lights replicating the vertical LED strips */}
      <pointLight
        position={[-halfW + 1.1, 4.2, -3.5]}
        color="#ffdfb0"
        intensity={16}
        distance={14}
        decay={1.9}
      />
      <pointLight
        position={[halfW - 1.1, 4.2, -3.5]}
        color="#ffdfb0"
        intensity={16}
        distance={14}
        decay={1.9}
      />
      <pointLight
        position={[-halfW + 1.1, 4.8, 2.2]}
        color="#ffdfb0"
        intensity={18}
        distance={15}
        decay={1.9}
      />
      <pointLight
        position={[halfW - 1.1, 4.8, 2.2]}
        color="#ffdfb0"
        intensity={18}
        distance={15}
        decay={1.9}
      />

      {/* Overhead & front-grazing rim light so every tiered row of plush headrests catches a soft sheen like 00:10–00:18 */}
      <directionalLight
        position={[0, 12, -5]}
        intensity={0.95}
        color="#d8e4dc"
      />
      <directionalLight
        position={[0, 14, 3]}
        intensity={0.65}
        color="#f5e6d0"
      />

      {/* Main low floor in front of Row A */}
      <mesh position={[0, -0.05, -6.2]} receiveShadow>
        <boxGeometry args={[HALL_DIMENSIONS.width + 0.4, 0.1, 5.4]} />
        <meshStandardMaterial color="#111114" roughness={0.85} metalness={0.06} />
      </mesh>

      {/* Sleek low dark stage apron directly beneath the screen (catches screen reflection like 00:09–00:10) */}
      <mesh
        position={[
          0,
          HALL_DIMENSIONS.stageHeight / 2,
          HALL_DIMENSIONS.screenZ + HALL_DIMENSIONS.stageDepth / 2 + 0.05,
        ]}
      >
        <boxGeometry
          args={[
            HALL_DIMENSIONS.width - 0.5,
            HALL_DIMENSIONS.stageHeight,
            HALL_DIMENSIONS.stageDepth,
          ]}
        />
        <meshStandardMaterial color="#16161a" roughness={0.32} metalness={0.18} />
      </mesh>
      {/* Subtle front bevel trim along stage edge */}
      <mesh
        position={[
          0,
          HALL_DIMENSIONS.stageHeight + 0.015,
          HALL_DIMENSIONS.screenZ + HALL_DIMENSIONS.stageDepth + 0.05,
        ]}
      >
        <boxGeometry args={[HALL_DIMENSIONS.width - 0.5, 0.03, 0.06]} />
        <meshStandardMaterial color="#27272e" roughness={0.45} metalness={0.3} />
      </mesh>

      {/* Tiered Stadium Risers (Rows A through H) */}
      {ROWS.map((row, i) => {
        const riserTopY = i * HALL_DIMENSIONS.rowStepY;
        const riserZ = HALL_DIMENSIONS.rowStartZ + i * HALL_DIMENSIONS.rowStepZ;
        const riserHeight = Math.max(0.14, riserTopY + 0.14);
        const riserDepth =
          i === ROWS.length - 1
            ? HALL_DIMENSIONS.backWallZ - (riserZ - HALL_DIMENSIONS.rowStepZ / 2)
            : HALL_DIMENSIONS.rowStepZ + 0.04;
        const centerZ =
          i === ROWS.length - 1
            ? riserZ - HALL_DIMENSIONS.rowStepZ / 2 + riserDepth / 2
            : riserZ;

        return (
          <group key={`riser-${row}`}>
            <mesh position={[0, riserTopY - riserHeight / 2, centerZ]}>
              <boxGeometry
                args={[HALL_DIMENSIONS.width + 0.2, riserHeight, riserDepth]}
              />
              <meshStandardMaterial
                color="#121215"
                roughness={0.93}
                metalness={0.04}
              />
            </mesh>
            {/* Subtle recessed warm step edge accent along center aisle */}
            {i > 0 && (
              <mesh
                position={[
                  0,
                  riserTopY - 0.01,
                  riserZ - HALL_DIMENSIONS.rowStepZ / 2 + 0.015,
                ]}
              >
                <boxGeometry args={[1.02, 0.022, 0.025]} />
                <meshBasicMaterial color="#8f7854" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Sculpted Plush Cinema Seats (InstancedMesh for silky 60fps) */}
      <instancedMesh
        ref={backrestRef}
        args={[backrestGeo, undefined, HALL_SEATS.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial roughness={0.68} metalness={0.08} />
      </instancedMesh>

      <instancedMesh
        ref={cushionRef}
        args={[undefined, undefined, HALL_SEATS.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.58, 0.14, 0.50]} />
        <meshStandardMaterial roughness={0.86} metalness={0.04} />
      </instancedMesh>

      <instancedMesh
        ref={armrestLeftRef}
        args={[undefined, undefined, HALL_SEATS.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.085, 0.08, 0.44]} />
        <meshStandardMaterial roughness={0.72} metalness={0.1} />
      </instancedMesh>

      <instancedMesh
        ref={armrestRightRef}
        args={[undefined, undefined, HALL_SEATS.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.085, 0.08, 0.44]} />
        <meshStandardMaterial roughness={0.72} metalness={0.1} />
      </instancedMesh>

      <instancedMesh
        ref={pedestalRef}
        args={[undefined, undefined, HALL_SEATS.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.38, 0.30, 0.24]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.9} metalness={0.12} />
      </instancedMesh>

      {/* Vivid illuminated royal-blue seat covers & soft glow on selected seats (visible during overhead dive 00:08 & 00:24) */}
      <group ref={selectedHighlightGroupRef}>
        {selectedSeatIds.map((id) => {
          const seat = HALL_SEATS.find((s) => s.id === id);
          if (!seat) return null;
          const [x, y, z] = seat.worldPosition;
          return (
            <group key={`sel-highlight-${id}`}>
              <mesh
                geometry={backrestGeo}
                position={[x, y + 0.73, z + 0.19]}
                rotation={[0.14, 0, 0]}
                scale={[1.015, 1.015, 1.02]}
              >
                <meshStandardMaterial
                  color="#3b7bf6"
                  emissive="#2563eb"
                  emissiveIntensity={0.85}
                  roughness={0.62}
                  metalness={0.05}
                />
              </mesh>
              <mesh
                position={[x, y + 0.365, z - 0.06]}
                rotation={[-0.06, 0, 0]}
              >
                <boxGeometry args={[0.59, 0.145, 0.51]} />
                <meshStandardMaterial
                  color="#2f6ee8"
                  emissive="#1d4ed8"
                  emissiveIntensity={0.7}
                  roughness={0.65}
                  metalness={0.05}
                />
              </mesh>
              <pointLight
                position={[x, y + 1.05, z]}
                color="#3b7bf6"
                intensity={1.6}
                distance={2.8}
                decay={2}
              />
            </group>
          );
        })}
      </group>

      {/* Left & Right Acoustic Backing Walls */}
      <mesh position={[-halfW - 0.08, wallH / 2, hallMidZ]}>
        <boxGeometry args={[0.16, wallH + 1.2, totalDepth + 0.6]} />
        <meshStandardMaterial color="#0b0b0d" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh position={[halfW + 0.08, wallH / 2, hallMidZ]}>
        <boxGeometry args={[0.16, wallH + 1.2, totalDepth + 0.6]} />
        <meshStandardMaterial color="#0b0b0d" roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Back Acoustic Wall behind Row H */}
      <mesh position={[0, wallH / 2, HALL_DIMENSIONS.backWallZ]}>
        <boxGeometry args={[HALL_DIMENSIONS.width + 0.5, wallH + 1.2, 0.2]} />
        <meshStandardMaterial color="#09090b" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Front Wall behind Screen */}
      <mesh position={[0, wallH / 2, HALL_DIMENSIONS.screenZ - 0.16]}>
        <boxGeometry args={[HALL_DIMENSIONS.width + 0.5, wallH + 1.2, 0.2]} />
        <meshStandardMaterial color="#060607" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Acoustic Ceiling — FrontSide facing downward so overhead camera sees straight through from above! */}
      <mesh position={[0, wallH, hallMidZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALL_DIMENSIONS.width + 0.4, totalDepth + 0.4]} />
        <meshStandardMaterial
          color="#070709"
          roughness={0.96}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Signature Floor-to-Ceiling Vertical Warm LED Strips + Dark Acoustic Battens (Left & Right Walls) */}
      {wallStripZs.map((z, idx) => (
        <group key={`wall-led-${idx}`}>
          {/* LEFT WALL: Dark architectural slat + bright warm LED core + soft volumetric halo */}
          <mesh position={[-halfW + 0.05, wallH / 2, z + 0.28]}>
            <boxGeometry args={[0.11, wallH, 0.34]} />
            <meshStandardMaterial color="#141315" roughness={0.86} metalness={0.08} />
          </mesh>
          <mesh position={[-halfW + 0.02, wallH / 2, z]}>
            <boxGeometry args={[0.032, wallH - 0.2, 0.042]} />
            <meshBasicMaterial color="#fff3d8" toneMapped={false} />
          </mesh>
          <mesh
            position={[-halfW + 0.06, wallH / 2, z]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.42, wallH - 0.1]} />
            <meshBasicMaterial
              map={glowTexture}
              transparent
              opacity={0.34}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* RIGHT WALL: Dark architectural slat + bright warm LED core + soft volumetric halo */}
          <mesh position={[halfW - 0.05, wallH / 2, z + 0.28]}>
            <boxGeometry args={[0.11, wallH, 0.34]} />
            <meshStandardMaterial color="#141315" roughness={0.86} metalness={0.08} />
          </mesh>
          <mesh position={[halfW - 0.02, wallH / 2, z]}>
            <boxGeometry args={[0.032, wallH - 0.2, 0.042]} />
            <meshBasicMaterial color="#fff3d8" toneMapped={false} />
          </mesh>
          <mesh
            position={[halfW - 0.06, wallH / 2, z]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.42, wallH - 0.1]} />
            <meshBasicMaterial
              map={glowTexture}
              transparent
              opacity={0.34}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Wall-Mounted Matte Black Surround Sound Speakers (visible when panning left/right at 00:14–00:18) */}
      {speakerZs.map((z, idx) => (
        <group key={`speakers-${idx}`}>
          {/* Left wall surround speaker */}
          <mesh
            position={[-halfW + 0.26, 5.2 + idx * 0.24, z]}
            rotation={[0, 0, -0.22]}
          >
            <boxGeometry args={[0.32, 0.68, 0.44]} />
            <meshStandardMaterial color="#101013" roughness={0.78} metalness={0.14} />
          </mesh>
          {/* Right wall surround speaker */}
          <mesh
            position={[halfW - 0.26, 5.2 + idx * 0.24, z]}
            rotation={[0, 0, 0.22]}
          >
            <boxGeometry args={[0.32, 0.68, 0.44]} />
            <meshStandardMaterial color="#101013" roughness={0.78} metalness={0.14} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
