"use client";

import Image from "next/image";
import type { LineFlexIcon } from "@/types/line-flex.types";
import { resolveTextSize, resolvePx } from "./line-flex-constants";

export function FlexIcon({ component }: { component: LineFlexIcon }) {
  const size = resolveTextSize(component.size ?? "md");

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        position: "relative",
        ...(component.margin
          ? { marginLeft: resolvePx(component.margin) }
          : {}),
      }}
    >
      <Image
        src={component.url}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
