"use client";

import type { LineFlexBubble, LineFlexBox } from "@/types/line-flex.types";
import { FlexImage } from "./FlexImage";
import { FlexBox } from "./FlexBox";
import { BUBBLE_MAX_WIDTH, BUBBLE_BORDER_RADIUS } from "./line-flex-constants";

/** セクションにデフォルト padding を適用（LINE 仕様: 各セクションは paddingAll="20px" がデフォルト） */
function withDefaultPadding(box: LineFlexBox): LineFlexBox {
  const hasPadding =
    box.paddingAll ||
    box.paddingTop ||
    box.paddingBottom ||
    box.paddingStart ||
    box.paddingEnd;
  if (hasPadding) return box;
  return { ...box, paddingAll: "20px" };
}

export function FlexBubble({ bubble }: { bubble: LineFlexBubble }) {
  return (
    <div
      style={{
        maxWidth: BUBBLE_MAX_WIDTH,
        width: BUBBLE_MAX_WIDTH,
        borderRadius: BUBBLE_BORDER_RADIUS,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }}
    >
      {/* Hero: no padding, full bleed image */}
      {bubble.hero && <FlexImage component={bubble.hero} />}

      {/* Header */}
      {bubble.header && (
        <FlexBox component={withDefaultPadding(bubble.header)} />
      )}

      {/* Body */}
      {bubble.body && (
        <FlexBox component={withDefaultPadding(bubble.body)} />
      )}

      {/* Footer: thin separator + padding */}
      {bubble.footer && (
        <>
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
            }}
          />
          <FlexBox component={withDefaultPadding(bubble.footer)} />
        </>
      )}
    </div>
  );
}
