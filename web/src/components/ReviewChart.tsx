"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/sim/types";
import type { DealTrade } from "@/lib/game/reviews";

function barIndex(candles: Candle[], bar: number): number {
  return candles.findIndex((c) => c.time === bar);
}

const BG = "#0b0f17";
const GRID = "#1b2433";
const TEXT = "#5b6b82";
const UP = "#26a69a";
const DOWN = "#ef5350";

export default function ReviewChart({
  candles,
  trades,
  focusIdx = null,
  height = 360,
}: {
  candles: Candle[];
  trades: DealTrade[];
  focusIdx?: number | null;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [viewStart, setViewStart] = useState(0);
  const dragRef = useRef<{ x: number; start: number } | null>(null);

  const candleW = 7;
  const gap = 2;
  const slot = candleW + gap;

  const maxVisible = (plotW: number) => Math.max(10, Math.floor(plotW / slot));
  const maxStart = (plotW: number) => Math.max(0, candles.length - maxVisible(plotW));

  const clampStart = useCallback(
    (start: number, plotW: number) => Math.max(0, Math.min(maxStart(plotW), Math.round(start))),
    [candles.length],
  );

  useEffect(() => {
    const on = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const plotW = (wrapRef.current?.clientWidth ?? 800) - 60;
    setViewStart((s) => clampStart(Math.max(s, maxStart(plotW)), plotW));
  }, [candles.length, resizeTick, clampStart]);

  useEffect(() => {
    if (focusIdx == null) return;
    const trade = trades[focusIdx];
    const wrap = wrapRef.current;
    if (!trade || !wrap) return;

    const plotW = wrap.clientWidth - 60;
    const visibleCount = maxVisible(plotW);
    const i1 = barIndex(candles, trade.openBar);
    const i2 = barIndex(candles, trade.closeBar);
    if (i1 < 0 && i2 < 0) return;

    const lo = Math.min(i1 < 0 ? i2 : i1, i2 < 0 ? i1 : i2);
    const hi = Math.max(i1, i2);
    const pad = Math.floor(visibleCount * 0.15);
    const target = clampStart(lo - pad, plotW);
    const end = hi + pad;
    const start =
      end - target > visibleCount
        ? clampStart(end - visibleCount + 1, plotW)
        : target;
    setViewStart(start);
  }, [focusIdx, trades, candles, clampStart]);

  const panByBars = useCallback(
    (deltaBars: number) => {
      const plotW = (wrapRef.current?.clientWidth ?? 800) - 60;
      setViewStart((s) => clampStart(s + deltaBars, plotW));
    },
    [clampStart],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      panByBars(delta > 0 ? 2 : -2);
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, [panByBars]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, start: viewStart };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const plotW = (wrapRef.current?.clientWidth ?? 800) - 60;
    const deltaBars = Math.round((drag.x - e.clientX) / slot);
    setViewStart(clampStart(drag.start + deltaBars, plotW));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || candles.length === 0) return;

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

    const padR = 60;
    const padB = 20;
    const plotW = W - padR;
    const plotH = H - padB;

    const visibleCount = maxVisible(plotW);
    const start = clampStart(viewStart, plotW);
    const visible = candles.slice(start, start + visibleCount);

    let hi = -Infinity;
    let lo = Infinity;
    for (const c of visible) {
      if (c.high > hi) hi = c.high;
      if (c.low < lo) lo = c.low;
    }
    for (const t of trades) {
      const i1 = barIndex(candles, t.openBar);
      const i2 = barIndex(candles, t.closeBar);
      if ((i1 >= start && i1 < start + visibleCount) || (i2 >= start && i2 < start + visibleCount)) {
        hi = Math.max(hi, t.entry, t.exit);
        lo = Math.min(lo, t.entry, t.exit);
      }
    }
    const range = hi - lo || 1;
    const pad = range * 0.08;
    hi += pad;
    lo -= pad;
    const span = hi - lo;
    const y = (price: number) => ((hi - price) / span) * plotH;
    const xForBar = (bar: number) => {
      const i = barIndex(candles, bar);
      if (i < start || i >= start + visibleCount) return null;
      const vi = i - start;
      return vi * slot + candleW / 2 + 2;
    };
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

    visible.forEach((c, vi) => {
      const x = vi * slot + candleW / 2 + 2;
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

    trades.forEach((t, idx) => {
      const x1 = xForBar(t.openBar);
      const x2 = xForBar(t.closeBar);
      if (x1 == null || x2 == null) return;
      const y1 = y(t.entry);
      const y2 = y(t.exit);
      const win = t.pnl >= 0;
      const focused = focusIdx === idx;
      const lineColor = win ? "#4ade80" : "#f87171";

      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = focused ? 0.95 : 0.45;
      ctx.lineWidth = focused ? 2 : 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;

      const drawArrow = (x: number, py: number, side: "long" | "short", kind: "entry" | "exit") => {
        const buy = kind === "entry" ? side === "long" : side === "short";
        const color = buy ? UP : DOWN;
        ctx.fillStyle = color;
        ctx.strokeStyle = focused ? "#fff" : color;
        ctx.lineWidth = focused ? 1.5 : 0.5;
        const sz = focused ? 7 : 5;
        ctx.beginPath();
        if (buy) {
          ctx.moveTo(x, py - sz);
          ctx.lineTo(x - sz, py + sz * 0.6);
          ctx.lineTo(x + sz, py + sz * 0.6);
        } else {
          ctx.moveTo(x, py + sz);
          ctx.lineTo(x - sz, py - sz * 0.6);
          ctx.lineTo(x + sz, py - sz * 0.6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      drawArrow(x1, y1, t.side, "entry");
      drawArrow(x2, y2, t.side, "exit");
    });

    ctx.font = "10px ui-monospace, monospace";
    ctx.fillStyle = TEXT;
    const rangeEnd = Math.min(candles.length, start + visible.length);
    ctx.fillText(
      `bars ${start + 1}–${rangeEnd} of ${candles.length} · ${trades.length} deals · drag or scroll to pan`,
      6,
      plotH - 4,
    );
  }, [candles, trades, focusIdx, height, resizeTick, viewStart, clampStart]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full cursor-grab select-none active:cursor-grabbing touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas ref={canvasRef} className="block w-full rounded-lg" />
    </div>
  );
}
