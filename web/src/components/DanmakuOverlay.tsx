"use client";

import { useEffect, useRef, useState } from "react";

export interface DanmakuItem {
  id: string;
  text: string;
  top: number;
  color: string;
}

export default function DanmakuOverlay({ items, enabled = true }: { items: DanmakuItem[]; enabled?: boolean }) {
  const [visible, setVisible] = useState<DanmakuItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const latest = items[items.length - 1];
    setVisible((v) => [...v, latest]);
    const t = setTimeout(() => {
      setVisible((v) => v.filter((x) => x.id !== latest.id));
    }, 9000);
    return () => clearTimeout(t);
  }, [items]);

  if (!enabled) return null;

  return (
    <div ref={trackRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {visible.map((d) => (
        <div
          key={d.id}
          className="danmaku-bullet absolute whitespace-nowrap rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-sm"
          style={{
            top: `${d.top}%`,
            left: trackWidth > 0 ? `${trackWidth}px` : "100%",
            color: d.color,
            ["--danmaku-distance" as string]: `${trackWidth}px`,
          }}
        >
          {d.text}
        </div>
      ))}
    </div>
  );
}