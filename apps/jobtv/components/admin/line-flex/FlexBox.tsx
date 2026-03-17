"use client";

import type { LineFlexBox, LineFlexComponent } from "@/types/line-flex.types";
import { FlexText } from "./FlexText";
import { FlexImage } from "./FlexImage";
import { FlexButton } from "./FlexButton";
import { FlexIcon } from "./FlexIcon";
import { FlexSeparator } from "./FlexSeparator";
import { FlexSpacer } from "./FlexSpacer";
import { resolvePx } from "./line-flex-constants";

function renderComponent(component: LineFlexComponent, index: number) {
  switch (component.type) {
    case "text":
      return <FlexText key={index} component={component} />;
    case "image":
      return <FlexImage key={index} component={component} />;
    case "button":
      return <FlexButton key={index} component={component} />;
    case "icon":
      return <FlexIcon key={index} component={component} />;
    case "separator":
      return <FlexSeparator key={index} component={component} />;
    case "spacer":
      return <FlexSpacer key={index} component={component} />;
    case "box":
      return <FlexBox key={index} component={component} />;
    default:
      return null;
  }
}

export function FlexBox({ component }: { component: LineFlexBox }) {
  const isHorizontal =
    component.layout === "horizontal" || component.layout === "baseline";

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? "row" : "column",
    ...(component.layout === "baseline"
      ? { alignItems: "baseline" }
      : {}),
    ...(component.justifyContent
      ? { justifyContent: component.justifyContent }
      : {}),
    ...(component.alignItems && component.layout !== "baseline"
      ? { alignItems: component.alignItems }
      : {}),
    gap: resolvePx(component.spacing),
    backgroundColor: component.backgroundColor,
    paddingTop: resolvePx(component.paddingAll ?? component.paddingTop),
    paddingBottom: resolvePx(
      component.paddingAll ?? component.paddingBottom
    ),
    paddingLeft: resolvePx(
      component.paddingAll ?? component.paddingStart
    ),
    paddingRight: resolvePx(
      component.paddingAll ?? component.paddingEnd
    ),
    ...(component.flex !== undefined ? { flex: component.flex } : {}),
    ...(component.width ? { width: resolvePx(component.width) } : {}),
    ...(component.height ? { height: resolvePx(component.height) } : {}),
    ...(component.margin
      ? isHorizontal
        ? { marginLeft: resolvePx(component.margin) }
        : { marginTop: resolvePx(component.margin) }
      : {}),
  };

  return (
    <div style={style}>
      {component.contents.map((child, i) => {
        // Flex の子要素にデフォルト flex:1 を適用（horizontal layout で flex 未指定の場合）
        const childAny = child as Record<string, unknown>;
        if (
          isHorizontal &&
          child.type !== "separator" &&
          child.type !== "spacer" &&
          childAny.flex === undefined
        ) {
          return renderComponent({ ...child, flex: 1 } as LineFlexComponent, i);
        }
        return renderComponent(child, i);
      })}
    </div>
  );
}
