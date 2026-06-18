import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded card shown when the site is shared on social platforms.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #134e34 0%, #0c3a27 55%, #0a2f3f 100%)",
          color: "#ffffff",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#8acca8",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 24,
            maxWidth: 920,
          }}
        >
          An open preprint server for the Earth and environmental sciences
        </div>
        <div style={{ fontSize: 30, marginTop: 32, color: "#cfe8da" }}>
          Free · Open access · Community-led
        </div>
      </div>
    ),
    { ...size }
  );
}
