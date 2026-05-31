import React from "react";
import { C } from "../theme";

// A glowing browser/device chrome holding media, tilted in 3D.
export const Frame3D: React.FC<{
  children: React.ReactNode;
  width: number;
  rotateY?: number;
  rotateX?: number;
  glow?: number;
  browser?: boolean;
  radius?: number;
}> = ({ children, width, rotateY = 0, rotateX = 0, glow = 1, browser = true, radius = 16 }) => {
  return (
    <div style={{ perspective: 1600 }}>
      <div
        style={{
          width,
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          borderRadius: radius,
          overflow: "hidden",
          border: `1px solid ${C.emerald}55`,
          background: C.panel,
          boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${60 * glow}px ${glow * 8}px ${C.emeraldGlow}`,
        }}
      >
        {browser && (
          <div
            style={{
              height: 34,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              background: "#0a1216",
              borderBottom: `1px solid ${C.emerald}22`,
            }}
          >
            <span style={{ width: 11, height: 11, borderRadius: 11, background: "#ff5f56" }} />
            <span style={{ width: 11, height: 11, borderRadius: 11, background: "#ffbd2e" }} />
            <span style={{ width: 11, height: 11, borderRadius: 11, background: "#27c93f" }} />
            <span
              style={{
                marginLeft: 14,
                fontSize: 13,
                color: C.sub,
                letterSpacing: 0.5,
              }}
            >
              tradr.app
            </span>
          </div>
        )}
        <div style={{ display: "block", lineHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
};
