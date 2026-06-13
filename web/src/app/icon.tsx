import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/seo/site";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.slate950,
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderBottom: `16px solid ${BRAND.emerald}`,
            transform: "rotate(0deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}