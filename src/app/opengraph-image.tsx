import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/lib/site";

export const alt = `${siteName}. ${siteTagline}.`;
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
          justifyContent: "center",
          backgroundColor: "#f3f5f7",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#1d4e89" }}>
          Central and state exams
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 76,
            lineHeight: 1.05,
            color: "#1c2834",
          }}
        >
          {siteName}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 36, color: "#52606d" }}>
          {siteTagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
