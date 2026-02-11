import { ImageResponse } from "next/og";

export const runtime = "edge";

function IconBase({
  size,
  purpose,
}: {
  size: number;
  purpose: "any" | "maskable";
}) {
  const padding = purpose === "maskable" ? Math.round(size * 0.18) : 0;
  const inner = size - padding * 2;
  const radius = Math.round(inner * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080810",
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: radius,
            background: "linear-gradient(135deg, #635BFF, #A78BFA)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              width: Math.round(inner * 0.56),
              height: Math.round(inner * 0.56),
              borderRadius: Math.round(inner * 0.16),
              background: "rgba(8,8,16,0.35)",
              border: "2px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: Math.round(inner * 0.22),
              fontWeight: 800,
              fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
              letterSpacing: -1,
            }}
          >
            PV
          </div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

export function renderAppIcon(size: number, purpose: "any" | "maskable") {
  return IconBase({ size, purpose });
}

