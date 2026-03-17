"use client";

import Image from "next/image";
import type { LineFlexImage } from "@/types/line-flex.types";
import { resolvePx } from "./line-flex-constants";

function parseAspectRatio(ratio?: string): number {
  if (!ratio) return 20 / 13;
  const parts = ratio.split(":");
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (w > 0 && h > 0) return w / h;
  }
  return 20 / 13;
}

export function FlexImage({ component }: { component: LineFlexImage }) {
  const ratio = parseAspectRatio(component.aspectRatio);
  const paddingBottom = `${(1 / ratio) * 100}%`;

  const wrapStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    paddingBottom,
    backgroundColor: component.backgroundColor,
    ...(component.flex !== undefined ? { flex: component.flex } : {}),
    ...(component.margin ? { marginTop: resolvePx(component.margin) } : {}),
  };

  if (component.gravity) {
    const gravityMap = {
      top: "flex-start",
      center: "center",
      bottom: "flex-end",
    } as const;
    wrapStyle.alignSelf = gravityMap[component.gravity];
  }

  return (
    <div style={wrapStyle}>
      {component.url ? (
        <Image
          src={component.url}
          alt=""
          fill
          unoptimized
          style={{
            objectFit:
              component.aspectMode === "fit" ? "contain" : "cover",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#f0f0f0",
          }}
        />
      )}
    </div>
  );
}
