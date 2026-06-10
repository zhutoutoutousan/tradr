"use client";

import { useEffect, useState } from "react";

// True for phone layouts: narrow viewports or portrait screens (Douyin / TikTok 9:16).
function detectMobile(breakpoint: number): boolean {
  if (typeof window === "undefined") return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w < breakpoint || (h > w && w <= 1200);
}

export function useIsMobile(breakpoint = 1024): boolean {
  const [mobile, setMobile] = useState(() => detectMobile(breakpoint));
  useEffect(() => {
    const update = () => setMobile(detectMobile(breakpoint));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);
  return mobile;
}
