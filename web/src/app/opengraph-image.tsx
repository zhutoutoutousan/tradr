import { ImageResponse } from "next/og";
import { BRAND, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const alt = "Tradr — browser trading game vs algorithmic bots";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: `linear-gradient(135deg, ${BRAND.slate950} 0%, #111827 45%, ${BRAND.slate900} 100%)`,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "26px solid transparent",
              borderRight: "26px solid transparent",
              borderBottom: `44px solid ${BRAND.emerald}`,
            }}
          />
          <div style={{ fontSize: 72, fontWeight: 800, color: BRAND.emerald }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.2, maxWidth: 980 }}>
          3-minute browser trading races vs algorithmic bots
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#94a3b8", lineHeight: 1.4, maxWidth: 1000 }}>
          {`${DEFAULT_DESCRIPTION.slice(0, 140)}…`}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 22, color: BRAND.sky }}>
          <span>Solo</span>
          <span>•</span>
          <span>Multiplayer</span>
          <span>•</span>
          <span>Gallery replays</span>
        </div>
      </div>
    ),
    { ...size },
  );
}