import { ImageResponse } from "next/og";
import { BRAND, SITE_NAME } from "@/lib/seo/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, ${BRAND.slate900} 0%, ${BRAND.slate950} 100%)`,
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "34px solid transparent",
            borderRight: "34px solid transparent",
            borderBottom: `58px solid ${BRAND.emerald}`,
          }}
        />
        <div style={{ marginTop: 14, fontSize: 28, fontWeight: 800, color: BRAND.emerald, letterSpacing: 1 }}>
          {SITE_NAME}
        </div>
      </div>
    ),
    { ...size },
  );
}