"use client";

import type { LineImagemapMessage } from "@/types/line-flex.types";
import { BUBBLE_MAX_WIDTH } from "./line-flex-constants";

const AREA_COLORS = [
  "rgba(6,199,85,0.3)",
  "rgba(59,130,246,0.3)",
  "rgba(239,68,68,0.3)",
  "rgba(245,158,11,0.3)",
  "rgba(139,92,246,0.3)",
  "rgba(236,72,153,0.3)",
  "rgba(20,184,166,0.3)",
  "rgba(249,115,22,0.3)",
];

export function FlexImagemap({ message }: { message: LineImagemapMessage }) {
  const { baseUrl, baseSize, actions } = message;
  const scale = BUBBLE_MAX_WIDTH / baseSize.width;
  const displayHeight = baseSize.height * scale;

  return (
    <div
      style={{
        position: "relative",
        width: BUBBLE_MAX_WIDTH,
        height: displayHeight,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={baseUrl}
        alt={message.altText}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        draggable={false}
      />
      {actions.map((action, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: action.area.x * scale,
            top: action.area.y * scale,
            width: action.area.width * scale,
            height: action.area.height * scale,
            backgroundColor: AREA_COLORS[i % AREA_COLORS.length],
            border: `1px solid ${AREA_COLORS[i % AREA_COLORS.length].replace("0.3", "0.6")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 4,
              padding: "1px 4px",
              lineHeight: "14px",
            }}
          >
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
