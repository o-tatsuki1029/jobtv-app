"use client";

import type { LineFlexSeparator } from "@/types/line-flex.types";
import { resolvePx } from "./line-flex-constants";

export function FlexSeparator({
  component,
}: {
  component: LineFlexSeparator;
}) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${component.color ?? "#EEEEEE"}`,
        margin: 0,
        ...(component.margin
          ? { marginTop: resolvePx(component.margin) }
          : {}),
        width: "100%",
      }}
    />
  );
}
