"use client";

import { useEffect, useRef } from "react";
import type { Candle, Position, Side } from "@/lib/sim/types";

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
  height?: number;
}

const BG = "#0b0f17";
const GRID = "#1b2433";
const TEXT = "#5b6b82";
const UP = "#26a69a";
const DOWN = "#ef5350";

export default function CandleChart({ candles, position, botPositions = [], height = 420 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = height;
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

    const padR = 64;
    const padB = 22;
    const plotW = W - padR;
    const plotH = H - padB;

    const candleW = 7;
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
    const range = hi - lo || 1;
    const pad = range * 0.08;
    hi += pad;
    lo -= pad;
    const span = hi - lo;
    const y = (price: number) => ((hi - price) / span) * plotH;

    // Grid + price axis.
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
      ctx.fillText(price.toFixed(2), plotW + 6, py + 4);
    }

    // Candles.
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

    // Current price line.
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
    ctx.fillText(last.close.toFixed(2), plotW + 4, lastY + 4);

    // Bot open positions (competition view): faint colored line + a direction
    // marker at the right edge so you can see where each robot is positioned.
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

      // Triangle marker pointing in the trade direction.
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

    // Position overlays.
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
      drawLevel(position.entry, position.side === "long" ? UP : DOWN, `${position.side.toUpperCase()} @ ${position.entry.toFixed(2)}`);
      if (position.sl) drawLevel(position.sl, "#f87171", "SL");
      if (position.tp) drawLevel(position.tp, "#4ade80", "TP");
    }
  }, [candles, position, botPositions, height]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="block w-full rounded-lg" />
    </div>
  );
}
