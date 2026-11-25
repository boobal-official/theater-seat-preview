"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HALL_DIMENSIONS } from "@/data/hallConfig";

/**
 * Draws the atmospheric emerald-lit "Avengers: Doomsday" widescreen canvas frame
 * matching the reference video (00:09–00:21), with gentle volumetric shimmer.
 */
function renderScreenFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  // Deep moody emerald-obsidian backdrop
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    height * 0.08,
    width * 0.5,
    height * 0.5,
    width * 0.62
  );
  bgGrad.addColorStop(0, "#1c3f26");
  bgGrad.addColorStop(0.38, "#0e2214");
  bgGrad.addColorStop(0.75, "#06100a");
  bgGrad.addColorStop(1, "#020503");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle towering gothic cathedral / portal light shafts in emerald green
  const pulse = 0.88 + Math.sin(time * 0.9) * 0.12;
  ctx.save();
  const shafts = [
    { x: 0.16, w: 0.085, alpha: 0.22 },
    { x: 0.27, w: 0.06, alpha: 0.28 },
    { x: 0.37, w: 0.11, alpha: 0.36 },
    { x: 0.52, w: 0.14, alpha: 0.44 },
    { x: 0.66, w: 0.1, alpha: 0.34 },
    { x: 0.77, w: 0.07, alpha: 0.24 },
    { x: 0.86, w: 0.06, alpha: 0.18 },
  ];

  for (let i = 0; i < shafts.length; i++) {
    const s = shafts[i];
    const drift = Math.sin(time * 0.45 + i * 1.3) * 0.008;
    const cx = (s.x + drift) * width;
    const sw = s.w * width;
    const g = ctx.createLinearGradient(cx - sw / 2, 0, cx + sw / 2, 0);
    g.addColorStop(0, "rgba(74, 178, 92, 0)");
    g.addColorStop(0.5, `rgba(116, 214, 128, ${s.alpha * pulse})`);
    g.addColorStop(1, "rgba(74, 178, 92, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - sw / 2, 0, sw, height);
  }

  // Dark vertical gothic structural ribs slicing the green light (matches 00:10 background)
  const ribs = [0.09, 0.21, 0.32, 0.44, 0.59, 0.72, 0.82, 0.92];
  for (const rx of ribs) {
    const x = rx * width;
    const ribGrad = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
    ribGrad.addColorStop(0, "rgba(3, 8, 5, 0)");
    ribGrad.addColorStop(0.5, "rgba(3, 8, 5, 0.84)");
    ribGrad.addColorStop(1, "rgba(3, 8, 5, 0)");
    ctx.fillStyle = ribGrad;
    ctx.fillRect(x - 24, 0, 48, height);
  }

  // Giant subtle translucent metallic "A" emblem silhouetted behind the wordmark
  ctx.save();
  ctx.translate(width * 0.5, height * 0.49);
  ctx.strokeStyle = `rgba(145, 224, 152, ${0.14 * pulse})`;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-128, 175);
  ctx.lineTo(14, -195);
  ctx.lineTo(126, 175);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 8, 146, 0.22, Math.PI * 1.82);
  ctx.stroke();
  ctx.restore();

  // Ambient emerald mist halo behind center title
  const centerGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.54,
    18,
    width * 0.5,
    height * 0.54,
    width * 0.34
  );
  centerGlow.addColorStop(0, `rgba(105, 210, 120, ${0.28 * pulse})`);
  centerGlow.addColorStop(0.55, `rgba(38, 112, 54, ${0.12 * pulse})`);
  centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle dark horizontal center band for ultra-crisp logo contrast
  const bandGrad = ctx.createLinearGradient(0, height * 0.3, 0, height * 0.78);
  bandGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  bandGrad.addColorStop(0.45, "rgba(2, 7, 4, 0.52)");
  bandGrad.addColorStop(0.7, "rgba(2, 7, 4, 0.52)");
  bandGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, height * 0.3, width, height * 0.48);

  // "MARVEL STUDIOS" top micro lockup
  const badgeW = 148;
  const badgeH = 22;
  const badgeX = width * 0.5 - badgeW / 2;
  const badgeY = height * 0.375;
  ctx.fillStyle = "rgba(185, 32, 38, 0.88)";
  ctx.fillRect(badgeX, badgeY, 64, badgeH);
  ctx.strokeStyle = "rgba(220, 232, 224, 0.65)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(badgeX + 64, badgeY, badgeW - 64, badgeH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 13px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("MARVEL", badgeX + 32, badgeY + badgeH / 2 + 0.5);
  ctx.font = "600 12px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#e6efe8";
  ctx.fillText("STUDIOS", badgeX + 64 + (badgeW - 64) / 2, badgeY + badgeH / 2 + 0.5);

  // Iconic metallic "AVENGERS" wordmark with subtle sweeping specular sheen
  const sheenOffset = ((Math.sin(time * 0.55) + 1) / 2) * width * 0.45;
  const titleGrad = ctx.createLinearGradient(
    width * 0.25 + sheenOffset * 0.25,
    height * 0.44,
    width * 0.72,
    height * 0.62
  );
  titleGrad.addColorStop(0, "#aebbb2");
  titleGrad.addColorStop(0.32, "#ffffff");
  titleGrad.addColorStop(0.55, "#b9cfc0");
  titleGrad.addColorStop(0.78, "#eef7f0");
  titleGrad.addColorStop(1, "#7c8e82");

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.font = "900 italic 108px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = titleGrad;
  ctx.fillText("AVENGERS", width * 0.5, height * 0.525);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeText("AVENGERS", width * 0.5, height * 0.525);
  ctx.restore();

  // Horizontal metallic divider accent
  const ruleGrad = ctx.createLinearGradient(
    width * 0.3,
    0,
    width * 0.7,
    0
  );
  ruleGrad.addColorStop(0, "rgba(130, 215, 145, 0)");
  ruleGrad.addColorStop(0.5, "rgba(175, 240, 185, 0.78)");
  ruleGrad.addColorStop(1, "rgba(130, 215, 145, 0)");
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(width * 0.31, height * 0.605, width * 0.38, 2);

  // Tracked glowing emerald-chrome "DOOMSDAY" subtitle
  ctx.save();
  ctx.shadowColor = "rgba(74, 214, 114, 0.65)";
  ctx.shadowBlur = 18;
  ctx.font = "700 32px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = "#d9f4df";
  const subtitle = "D O O M S D A Y";
  ctx.fillText(subtitle, width * 0.5, height * 0.665);
  ctx.restore();

  // Soft cinematic edge vignette
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    height * 0.35,
    width * 0.5,
    height * 0.5,
    width * 0.64
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.8, "rgba(0,0,0,0.32)");
  vig.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

export function CinemaScreen() {
  const lastDrawRef = useRef(0);

  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1280;
    c.height = 540;
    const context = c.getContext("2d")!;
    renderScreenFrame(context, c.width, c.height, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Subtle ~15fps ambient shimmer update so the screen feels alive like a real projection
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (t - lastDrawRef.current > 0.065) {
      lastDrawRef.current = t;
      renderScreenFrame(ctx, canvas.width, canvas.height, t);
      texture.needsUpdate = true;
    }
  });

  const { screenWidth, screenHeight, screenY, screenZ } = HALL_DIMENSIONS;

  return (
    <group position={[0, screenY, screenZ]}>
      {/* Deep acoustic black velvet surround mask framing the screen */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[screenWidth + 1.6, screenHeight + 1.2]} />
        <meshStandardMaterial color="#050506" roughness={0.96} metalness={0.0} />
      </mesh>

      {/* Thin beveled dark cinema frame */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[screenWidth + 0.22, screenHeight + 0.22, 0.06]} />
        <meshStandardMaterial color="#0c0c0f" roughness={0.75} metalness={0.18} />
      </mesh>

      {/* Illuminated projection screen surface */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {/* Soft emerald-tinted screen bounce lights illuminating the stage apron & front seats */}
      <pointLight
        position={[0, -0.4, 2.2]}
        color="#9ad8aa"
        intensity={18}
        distance={16}
        decay={1.85}
      />
      <pointLight
        position={[-3.4, 0.2, 2.6]}
        color="#78ba8a"
        intensity={7.5}
        distance={13}
        decay={2}
      />
      <pointLight
        position={[3.4, 0.2, 2.6]}
        color="#78ba8a"
        intensity={7.5}
        distance={13}
        decay={2}
      />
    </group>
  );
}
