"use client";

import type { LineFlexButton } from "@/types/line-flex.types";
import {
  LINE_GREEN,
  BUTTON_BORDER_RADIUS,
  resolvePx,
} from "./line-flex-constants";

export function FlexButton({ component }: { component: LineFlexButton }) {
  const st = component.style ?? "primary";
  const label = component.action.label || "ボタン";
  const isSmall = component.height === "sm";

  const base: React.CSSProperties = {
    borderRadius: BUTTON_BORDER_RADIUS,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    padding: isSmall ? "8px 12px" : "12px 16px",
    lineHeight: 1.4,
    ...(component.flex !== undefined ? { flex: component.flex } : {}),
    ...(component.margin ? { marginTop: resolvePx(component.margin) } : {}),
  };

  if (st === "primary") {
    base.backgroundColor = component.color ?? LINE_GREEN;
    base.color = "#ffffff";
  } else if (st === "secondary") {
    base.backgroundColor = "transparent";
    base.border = `1px solid ${component.color ?? "#DCDCDC"}`;
    base.color = component.color ?? "#111111";
  } else {
    // link
    base.backgroundColor = "transparent";
    base.color = component.color ?? LINE_GREEN;
    base.fontWeight = 700;
  }

  return <div style={base}>{label}</div>;
}
