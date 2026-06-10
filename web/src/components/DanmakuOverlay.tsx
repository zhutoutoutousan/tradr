"use client";

import { useEffect, useState } from "react";

export interface DanmakuItem {
  id: string;
  text: string;
  top: number;
  color: string;
}

export default function DanmakuOverlay({ items }: { items: DanmakuItem[] }) {
  const [visible, setVisible] = useState<DanmakuItem[]>([]);

  useEffect(() => {
    if (items.length === 0) return;
    const latest = items[items.length - 1];
    setVisible((v) => [...v, latest]);
    const t = setTimeout(() => {
      setVisible((v) => v.filter((x) => x.id !== latest.id));
    }, 9000);
    return () => clearTimeout(t);
  }, [items]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {visible.map((d) => (
        <div
          key={d.id}
          className="danmaku-bullet absolute whitespace-nowrap rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-sm"
          style={{ top: `${d.top}%`, color: d.color }}
        >
          {d.text}
        </div>
      ))}
    </div>
  );
}
