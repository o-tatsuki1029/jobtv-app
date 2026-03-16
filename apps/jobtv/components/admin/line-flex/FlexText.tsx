"use client";

import type { LineFlexText } from "@/types/line-flex.types";
import {
  resolveTextSize,
  resolvePx,
  DEFAULT_TEXT_COLOR,
} from "./line-flex-constants";

export function FlexText({ component }: { component: LineFlexText }) {
  const fontSize = resolveTextSize(component.size);

  const alignMap = { start: "left", center: "center", end: "right" } as const;

  const style: React.CSSProperties = {
    fontSize,
    fontWeight: component.weight === "bold" ? 700 : 400,
    color: component.color ?? DEFAULT_TEXT_COLOR,
    textAlign: alignMap[component.align ?? "start"] ?? "left",
    margin: 0,
    lineHeight: 1.5,
    fontStyle: component.style === "italic" ? "italic" : "normal",
    textDecoration:
      component.decoration === "underline"
        ? "underline"
        : component.decoration === "line-through"
          ? "line-through"
          : "none",
    ...(component.flex !== undefined ? { flex: component.flex } : {}),
    ...(component.margin ? { marginTop: resolvePx(component.margin) } : {}),
    ...(component.lineSpacing
      ? { lineHeight: component.lineSpacing }
      : {}),
  };

  // gravity → alignSelf in flex parent
  if (component.gravity) {
    const gravityMap = {
      top: "flex-start",
      center: "center",
      bottom: "flex-end",
    } as const;
    style.alignSelf = gravityMap[component.gravity];
  }

  if (!component.wrap) {
    style.overflow = "hidden";
    style.textOverflow = "ellipsis";
    style.whiteSpace = "nowrap";
  } else {
    style.wordBreak = "break-word";
    style.whiteSpace = "pre-wrap";
  }

  if (component.wrap && component.maxLines && component.maxLines > 0) {
    style.display = "-webkit-box";
    style.WebkitLineClamp = component.maxLines;
    style.WebkitBoxOrient = "vertical";
    style.overflow = "hidden";
  }

  return <p style={style}>{component.text}</p>;
}
