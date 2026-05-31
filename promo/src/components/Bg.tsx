import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C } from "../theme";

// Deterministic pseudo-random for procedural candles.
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const Bg: React.FC<{ vertical?: boolean }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cols = vertical ? 26 : 40;
  const cw = width / cols;
  const scroll = (frame * cw) / 22;

  const candles = [];
  for (let i = -1; i < cols + 2; i++) {
    const seed = i + Math.floor(scroll / cw);
    const x = i * cw - (scroll % cw);
    const base = height * (0.45 + 0.18 * Math.sin(seed * 0.6));
    const h = 40 + rnd(seed) * (vertical ? 240 : 150);
    const up = rnd(seed * 1.7) > 0.5;
    const wick = h * 1.5;
    candles.push(
      <g key={i} opacity={0.16}>
        <rect
          x={x + cw * 0.5 - 1}
          y={base - wick / 2}
          width={2}
          height={wick}
          fill={up ? C.emerald : C.red}
        />
        <rect
          x={x + cw * 0.2}
          y={base - h / 2}
          width={cw * 0.6}
          height={h}
          rx={2}
          fill={up ? C.emerald : C.red}
        />
      </g>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg0 }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 12%, ${C.bg1} 0%, ${C.bg0} 60%, #02040600 100%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.7 }}>
        <svg width={width} height={height}>
          {candles}
        </svg>
      </AbsoluteFill>
      {/* subtle moving grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.emerald}14 1px, transparent 1px), linear-gradient(90deg, ${C.emerald}10 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          backgroundPosition: `0px ${(frame * 0.6) % 64}px`,
          opacity: 0.35,
        }}
      />
      {/* glow + vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at 50% 38%, ${C.emeraldGlow} 0%, transparent 60%)`,
          opacity: 0.18,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 320px 80px rgba(0,0,0,0.85)",
        }}
      />
    </AbsoluteFill>
  );
};
