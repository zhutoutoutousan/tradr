"use client";

import { useEffect, useState } from "react";

// True when the viewport is narrower than `breakpoint` (default Tailwind `lg`).
export function useIsMobile(breakpoint = 1024): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < breakpoint);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);
  return mobile;
}
