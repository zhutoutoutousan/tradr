"use client";

import { useEffect, useRef, useState } from "react";
import type { Candle, Position, Side } from "@/lib/sim/types";
import { buildOverlays } from "@/lib/game/chartOverlays";
import type { ChartIndicator } from "@/lib/game/roundSetup";

export interface BotMarker {
  label: string;
  color: string;
  side: Side;
  entry: number;
}

interface Props {
  candles: Candle[];
  position: Position | null;
  botPositions?: BotMarker[];
  indicators?: ChartIndicator[];
  height?: number;
  /** Grow to fill the parent flex area (mobile portrait). */
  fill?: boolean;
  // Desktop mouse trading: left = long, right = close, middle = short.
  enableMouseTrading?: boolean;
  onBuy?: () => void;
  onSell?: () => void;
  onClose?: () => void;
}

const BG = "#0b0f17";
const GRID = "#1b2433";
const TEXT = "#5b6b82";
const UP = "#26a69a";
const DOWN = "#ef5350";

export default function CandleChart({
  candles,
  position,
  botPositions = [],
  indicators = [],
  height = 420,
  fill = false,
  enableMouseTrading = false,
  onBuy,
  onSell,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const on = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", on);
    const wrap = wrapRef.current;
    const ro = fill && wrap ? new ResizeObserver(on) : null;
    ro?.observe(wrap!);
    return () => {
      window.removeEventListener("resize", on);
      ro?.disconnect();
    };
  }, [fill]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = fill ? wrap.clientHeight : height;
    if (cssW <= 0 || cssH <= 0) return;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = cssW;
    const H = cssH;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const padR = 60;
    const padB = 20;
    const plotW = W - padR;
    const hasOsc = indicators.some((i) => i.kind === "rsi" || i.kind === "macd");
    const oscH = hasOsc ? Math.floor(H * 0.16) : 0;
    const plotH = H - padB - oscH;

    // Slightly wider candles on small screens so they remain legible.
    const candleW = W < 480 ? 5 : 7;
    const gap = 2;
    const slot = candleW + gap;
    const maxVisible = Math.max(10, Math.floor(plotW / slot));
    const visible = candles.slice(-maxVisible);
    if (visible.length === 0) return;

    let hi = -Infinity;
    let lo = Infinity;
    for (const c of visible) {
      if (c.high > hi) hi = c.high;
      if (c.low < lo) lo = c.low;
    }
    if (position) {
      hi = Math.max(hi, position.entry);
      lo = Math.min(lo, position.entry);
      if (position.sl) lo = Math.min(lo, position.sl);
      if (position.tp) hi = Math.max(hi, position.tp);
    }
    for (const b of botPositions) {
      hi = Math.max(hi, b.entry);
      lo = Math.min(lo, b.entry);
    }

    const overlayLines = indicators.length > 0 ? buildOverlays(candles, indicators) : [];
    const priceLines = overlayLines.filter((l) => !l.dashed);
    const oscLines = overlayLines.filter((l) => l.dashed);
    const visStart = candles.length - visible.length;
    for (const line of priceLines) {
      for (let vi = 0; vi < visible.length; vi++) {
        const gi = visStart + vi;
        if (gi >= line.values.length) continue;
        const v = line.values[gi];
        if (!Number.isNaN(v)) {
          hi = Math.max(hi, v);
          lo = Math.min(lo, v);
        }
      }
    }

    const range = hi - lo || 1;
    const pad = range * 0.08;
    hi += pad;
    lo -= pad;
    const span = hi - lo;
    const y = (price: number) => ((hi - price) / span) * plotH;
    const fmt = (p: number) => (p < 10 ? p.toFixed(4) : p.toFixed(2));

    ctx.strokeStyle = GRID;
    ctx.fillStyle = TEXT;
    ctx.font = "11px ui-monospace, monospace";
    ctx.lineWidth = 1;
    const rows = 5;
    for (let i = 0; i <= rows; i++) {
      const py = (i / rows) * plotH;
      const price = hi - (i / rows) * span;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW, py);
      ctx.stroke();
      ctx.fillText(fmt(price), plotW + 4, py + 4);
    }

    const drawSeries = (
      values: number[],
      color: string,
      dashed: boolean,
      yMap: (v: number) => number,
      startIdx: number,
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.beginPath();
      let started = false;
      for (let vi = 0; vi < visible.length; vi++) {
        const gi = startIdx + vi;
        if (gi >= values.length) continue;
        const v = values[gi];
        if (Number.isNaN(v)) {
          started = false;
          continue;
        }
        const x = vi * slot + candleW / 2 + 2;
        const py = yMap(v);
        if (!started) {
          ctx.moveTo(x, py);
          started = true;
        } else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    for (const line of priceLines) {
      drawSeries(line.values, line.color, !!line.dashed, y, visStart);
    }

    if (oscH > 0 && oscLines.length > 0) {
      const oy0 = plotH + 6;
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, oy0, plotW, oscH - 6);
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(0, oy0);
      ctx.lineTo(plotW, oy0);
      ctx.stroke();
      for (const line of oscLines) {
        let oHi = -Infinity;
        let oLo = Infinity;
        for (let vi = 0; vi < visible.length; vi++) {
          const gi = visStart + vi;
          if (gi >= line.values.length) continue;
          const v = line.values[gi];
          if (!Number.isNaN(v)) {
            oHi = Math.max(oHi, v);
            oLo = Math.min(oLo, v);
          }
        }
        const oSpan = oHi - oLo || 1;
        const oy = (v: number) => oy0 + ((oHi - v) / oSpan) * (oscH - 10) + 2;
        drawSeries(line.values, line.color, true, oy, visStart);
      }
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = TEXT;
      ctx.fillText("osc", 4, oy0 + 10);
      ctx.font = "11px ui-monospace, monospace";
    }

    visible.forEach((c, i) => {
      const x = i * slot + candleW / 2 + 2;
      const up = c.close >= c.open;
      ctx.strokeStyle = up ? UP : DOWN;
      ctx.fillStyle = up ? UP : DOWN;
      ctx.beginPath();
      ctx.moveTo(x, y(c.high));
      ctx.lineTo(x, y(c.low));
      ctx.stroke();
      const oy = y(c.open);
      const cy = y(c.close);
      const top = Math.min(oy, cy);
      const h = Math.max(1, Math.abs(cy - oy));
      ctx.fillRect(x - candleW / 2, top, candleW, h);
    });

    const last = visible[visible.length - 1];

    const lastY = y(last.close);
    ctx.strokeStyle = "#3b82f6";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(plotW, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(plotW, lastY - 8, padR, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(fmt(last.close), plotW + 3, lastY + 4);

    ctx.font = "10px ui-monospace, monospace";
    for (const b of botPositions) {
      const py = y(b.entry);
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([1, 5]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW - 12, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const mx = plotW - 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      if (b.side === "long") {
        ctx.moveTo(mx, py - 5);
        ctx.lineTo(mx - 5, py + 4);
        ctx.lineTo(mx + 5, py + 4);
      } else {
        ctx.moveTo(mx, py + 5);
        ctx.lineTo(mx - 5, py - 4);
        ctx.lineTo(mx + 5, py - 4);
      }
      ctx.closePath();
      ctx.fill();

      ctx.textAlign = "right";
      ctx.fillText(b.label, plotW - 16, py - 3);
      ctx.textAlign = "left";
    }
    ctx.font = "11px ui-monospace, monospace";

    const drawLevel = (price: number, color: string, label: string) => {
      const py = y(price);
      ctx.strokeStyle = color;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.fillText(label, 6, py - 4);
    };
    if (position) {
      drawLevel(
        position.entry,
        position.side === "long" ? UP : DOWN,
        `${position.side.toUpperCase()} @ ${fmt(position.entry)}`,
      );
      if (position.sl) drawLevel(position.sl, "#f87171", "SL");
      if (position.tp) drawLevel(position.tp, "#4ade80", "TP");
    }
  }, [candles, position, botPositions, indicators, height, fill, resizeTick]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full select-none ${fill ? "h-full min-h-[200px]" : ""}`}
      style={enableMouseTrading ? { cursor: "crosshair" } : !fill ? { height } : undefined}
      onClick={enableMouseTrading ? () => onBuy?.() : undefined}
      onContextMenu={
        enableMouseTrading
          ? (e) => {
              e.preventDefault();
              onClose?.();
            }
          : undefined
      }
      onAuxClick={
        enableMouseTrading
          ? (e) => {
              if (e.button === 1) {
                e.preventDefault();
                onSell?.();
              }
            }
          : undefined
      }
    >
      <canvas ref={canvasRef} className="block w-full rounded-lg" />
      {enableMouseTrading && (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-[10px] text-slate-400">
          L-click <span className="text-emerald-400">Long</span> · R-click Close · M-click{" "}
          <span className="text-rose-400">Short</span>
        </div>
      )}
    </div>
  );
}
