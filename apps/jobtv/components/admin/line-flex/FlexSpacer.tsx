"use client";

import type { LineFlexSpacer } from "@/types/line-flex.types";
import { resolvePx } from "./line-flex-constants";

export function FlexSpacer({ component }: { component: LineFlexSpacer }) {
  const size = resolvePx(component.size ?? "md") ?? "8px";
  return <div style={{ flexShrink: 0, width: size, height: size }} />;
}
