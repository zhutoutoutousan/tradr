import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Bg } from "./components/Bg";
import { Frame3D } from "./components/Frame3D";
import { C, FONT } from "./theme";

type P = { vertical: boolean };

const ease = (f: number, a: number, b: number, c = 0, d = 1) =>
  interpolate(f, [a, b], [c, d], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ---------- Scene 1: brand intro + tagline ----------
const Intro: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const logoRot = interpolate(pop, [0, 1], [-90, 0]);
  const out = ease(frame, 60, 76, 1, 0);

  const big = vertical ? 96 : 132;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ perspective: 1200 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            transform: `rotateY(${logoRot}deg) scale(${0.6 + pop * 0.4})`,
          }}
        >
          <div
            style={{
              width: big * 0.62,
              height: big * 0.62,
              background: `linear-gradient(135deg, ${C.emeraldBright}, ${C.emerald})`,
              transform: "rotate(45deg)",
              borderRadius: 14,
              boxShadow: `0 0 60px ${C.emeraldGlow}`,
            }}
          />
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: big, color: C.text, letterSpacing: -2 }}>
            Tradr
          </span>
        </div>
      </div>
      <div
        style={{
          marginTop: vertical ? 48 : 36,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: vertical ? 50 : 56,
          color: C.text,
          textAlign: "center",
          opacity: ease(frame, 18, 34),
          transform: `translateY(${ease(frame, 18, 34, 30, 0)}px)`,
          lineHeight: 1.1,
        }}
      >
        Outtrade the{" "}
        <span style={{ color: C.emeraldBright }}>algorithms</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Generic kinetic caption ----------
const Caption: React.FC<{ kicker: string; title: React.ReactNode; vertical: boolean; from?: number }> = ({
  kicker,
  title,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 0, 14);
  return (
    <div style={{ textAlign: "center", transform: `translateY(${ease(frame, 0, 14, 24, 0)}px)`, opacity: a }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: vertical ? 24 : 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: C.emeraldBright,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: vertical ? 58 : 64,
          color: C.text,
          letterSpacing: -1.5,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
    </div>
  );
};

// ---------- Scene 2: live trading recording ----------
const LiveTrade: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const rotY = interpolate(s, [0, 1], [22, vertical ? 0 : -8]);
  const w = vertical ? 980 : 1180;
  const out = ease(frame, 100, 115, 1, 0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: vertical ? "flex-start" : "center", opacity: out }}>
      <div style={{ marginTop: vertical ? 140 : 0, display: "flex", flexDirection: "column", alignItems: "center", gap: vertical ? 60 : 0 }}>
        {vertical && <Caption kicker="Live market" title={<>Real-time.<br />Real fast.</>} vertical={vertical} />}
        <div style={{ transform: `scale(${0.85 + s * 0.15}) translateY(${ease(frame, 0, 20, 40, 0)}px)`, opacity: ease(frame, 0, 16) }}>
          <Frame3D width={w} rotateY={rotY} rotateX={3} glow={1.1}>
            <OffthreadVideo src={staticFile("rec/trading.webm")} muted style={{ width: "100%", display: "block" }} />
          </Frame3D>
        </div>
        {!vertical && (
          <div style={{ position: "absolute", left: 80, bottom: 110 }}>
            <Caption kicker="Live market" title={<>Real-time.<br />Real fast.</>} vertical={vertical} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 3: bots + leaderboard ----------
const BOTS = ["RSI Scalper", "EMA Slope", "Trend Rider", "MACD Momentum", "Bollinger Reversion", "Donchian Breakout"];
const Bots: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20 } });
  const w = vertical ? 1000 : 1240;
  const zoom = interpolate(s, [0, 1], [1.12, 1]);
  const out = ease(frame, 100, 116, 1, 0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <Caption
        kicker="Six bots. One tape."
        title={vertical ? <>Beat the<br />machines.</> : <>You vs the machines.</>}
        vertical={vertical}
      />
      <div style={{ height: vertical ? 40 : 28 }} />
      <div style={{ transform: `scale(${zoom})`, opacity: ease(frame, 0, 14) }}>
        <Frame3D width={w} rotateY={vertical ? 0 : 6} rotateX={2} glow={1}>
          <Img src={staticFile("shots/play-position.png")} style={{ width: "100%", display: "block" }} />
        </Frame3D>
      </div>
      {/* bot name ticker */}
      <div
        style={{
          marginTop: vertical ? 36 : 26,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: vertical ? 1000 : 1240,
        }}
      >
        {BOTS.map((b, i) => (
          <span
            key={b}
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: vertical ? 24 : 22,
              color: C.text,
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${C.emerald}55`,
              background: "rgba(16,185,129,0.08)",
              opacity: ease(frame, 18 + i * 5, 30 + i * 5),
              transform: `translateY(${ease(frame, 18 + i * 5, 30 + i * 5, 16, 0)}px)`,
            }}
          >
            {b}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 4: multiplayer ----------
const Multiplayer: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20 } });
  const out = ease(frame, 76, 92, 1, 0);
  const deskW = vertical ? 940 : 1080;
  const phoneW = vertical ? 300 : 300;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <Caption kicker="Multiplayer" title={vertical ? <>Race your<br />friends.</> : <>Race your friends.</>} vertical={vertical} />
      <div style={{ height: vertical ? 50 : 34 }} />
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          gap: vertical ? 40 : 56,
          opacity: ease(frame, 0, 16),
        }}
      >
        <div style={{ transform: `translateX(${ease(frame, 0, 22, vertical ? 0 : -60, 0)}px) translateY(${ease(frame, 0, 22, vertical ? -30 : 0, 0)}px)` }}>
          <Frame3D width={deskW} rotateY={vertical ? 0 : 10} rotateX={2} glow={0.9}>
            <Img src={staticFile("shots/mp-lobby.png")} style={{ width: "100%", display: "block" }} />
          </Frame3D>
        </div>
        <div style={{ transform: `translateY(${ease(frame, 6, 26, 40, 0)}px) scale(${0.9 + s * 0.1})` }}>
          <Frame3D width={phoneW} rotateY={vertical ? 0 : -10} rotateX={2} glow={1.1} browser={false} radius={28}>
            <Img src={staticFile("shots/mp-mobile.png")} style={{ width: "100%", display: "block" }} />
          </Frame3D>
        </div>
      </div>
      <div
        style={{
          marginTop: vertical ? 44 : 30,
          fontFamily: FONT,
          fontSize: vertical ? 26 : 24,
          color: C.sub,
          opacity: ease(frame, 24, 40),
        }}
      >
        Same seeded market · synced by clock · phone or desktop
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 5: CTA ----------
const CTA: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${0.7 + pop * 0.3})` }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: `linear-gradient(135deg, ${C.emeraldBright}, ${C.emerald})`,
            transform: "rotate(45deg)",
            borderRadius: 12,
            boxShadow: `0 0 50px ${C.emeraldGlow}`,
          }}
        />
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: vertical ? 84 : 96, color: C.text, letterSpacing: -2 }}>
          Tradr
        </span>
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: vertical ? 56 : 64,
          color: C.text,
          textAlign: "center",
          letterSpacing: -1.5,
          lineHeight: 1.08,
          opacity: ease(frame, 12, 28),
          transform: `translateY(${ease(frame, 12, 28, 24, 0)}px)`,
        }}
      >
        Outtrade the <span style={{ color: C.emeraldBright }}>algorithms</span>
        <br />in real time.
      </div>
      <div
        style={{
          marginTop: 40,
          padding: vertical ? "20px 52px" : "22px 60px",
          borderRadius: 999,
          background: `linear-gradient(135deg, ${C.emeraldBright}, ${C.emerald})`,
          color: "#04130d",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: vertical ? 34 : 36,
          boxShadow: `0 0 60px ${C.emeraldGlow}`,
          opacity: ease(frame, 24, 40),
          transform: `scale(${0.9 + ease(frame, 24, 44) * 0.1})`,
        }}
      >
        Play free
      </div>
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 4, 10], [0, 0.5, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: C.emeraldBright, opacity: o, mixBlendMode: "screen" }} />;
};

export const Promo: React.FC<P> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = ease(frame, durationInFrames - 12, durationInFrames, 1, 0);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg0 }}>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Bg vertical={vertical} />

        <Sequence from={0} durationInFrames={78}>
          <Intro vertical={vertical} />
        </Sequence>

        <Sequence from={70} durationInFrames={120}>
          <LiveTrade vertical={vertical} />
        </Sequence>
        <Sequence from={68} durationInFrames={12}>
          <Flash />
        </Sequence>

        <Sequence from={184} durationInFrames={120}>
          <Bots vertical={vertical} />
        </Sequence>
        <Sequence from={182} durationInFrames={12}>
          <Flash />
        </Sequence>

        <Sequence from={298} durationInFrames={96}>
          <Multiplayer vertical={vertical} />
        </Sequence>
        <Sequence from={296} durationInFrames={12}>
          <Flash />
        </Sequence>

        <Sequence from={388} durationInFrames={62}>
          <CTA vertical={vertical} />
        </Sequence>

        {/* scanning line accent */}
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${(frame * 1.2) % 100}%`,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${C.emeraldGlow}, transparent)`,
              opacity: 0.25,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      <Audio src={staticFile("music.wav")} />
    </AbsoluteFill>
  );
};
