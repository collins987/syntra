import { ImageResponse } from "next/og"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

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
          background: "#0a0a0f",
          borderRadius: "114px",
          border: "10px solid rgba(0,229,255,0.18)",
        }}
      >
        {/* Subtle inner glow ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "114px",
            background:
              "radial-gradient(ellipse 60% 55% at 50% 35%, rgba(0,229,255,0.13) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Letter S */}
        <span
          style={{
            color: "#00e5ff",
            fontSize: 290,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-18px",
            fontFamily: "sans-serif",
            textShadow: "0 0 60px rgba(0,229,255,0.55)",
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  )
}
