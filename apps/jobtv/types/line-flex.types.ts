// ─── LINE Actions ───
export type LineUriAction = { type: "uri"; label: string; uri: string };
export type LineMessageAction = { type: "message"; label: string; text: string };
export type LineAction = LineUriAction | LineMessageAction;

// ─── Flex Components (LINE Messaging API 準拠) ───

export type LineFlexText = {
  type: "text";
  text: string;
  size?: string; // keyword ("xxs"–"5xl") or "Npx"
  weight?: "regular" | "bold";
  color?: string;
  wrap?: boolean;
  align?: "start" | "end" | "center";
  gravity?: "top" | "center" | "bottom";
  maxLines?: number;
  style?: "normal" | "italic";
  decoration?: "none" | "underline" | "line-through";
  lineSpacing?: string;
  action?: LineAction;
  flex?: number;
  margin?: string;
};

export type LineFlexImage = {
  type: "image";
  url: string;
  size?: string; // keyword or "Npx"
  aspectRatio?: string;
  aspectMode?: "cover" | "fit";
  backgroundColor?: string;
  action?: LineAction;
  flex?: number;
  margin?: string;
  gravity?: "top" | "center" | "bottom";
};

export type LineFlexButton = {
  type: "button";
  action: LineAction;
  style?: "primary" | "secondary" | "link";
  color?: string;
  height?: "sm" | "md";
  flex?: number;
  margin?: string;
  gravity?: "top" | "center" | "bottom";
};

export type LineFlexIcon = {
  type: "icon";
  url: string;
  size?: string;
  margin?: string;
};

export type LineFlexSeparator = {
  type: "separator";
  margin?: string;
  color?: string;
};

export type LineFlexSpacer = {
  type: "spacer";
  size?: string;
};

export type LineFlexComponent =
  | LineFlexText
  | LineFlexImage
  | LineFlexButton
  | LineFlexIcon
  | LineFlexSeparator
  | LineFlexSpacer
  | LineFlexBox;

export type LineFlexBox = {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  contents: LineFlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  flex?: number;
  width?: string;
  height?: string;
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end";
  action?: LineAction;
};

export type LineFlexBubble = {
  type: "bubble";
  size?: "nano" | "micro" | "kilo" | "mega" | "giga";
  hero?: LineFlexImage;
  header?: LineFlexBox;
  body?: LineFlexBox;
  footer?: LineFlexBox;
};

export type LineFlexCarousel = {
  type: "carousel";
  contents: LineFlexBubble[];
};

// ─── Messages ───
export type LineTextMessage = { type: "text"; text: string };
export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: LineFlexBubble | LineFlexCarousel;
};
export type LineImageMessage = {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
};

// ─── Imagemap ───
export type LineImagemapArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LineImagemapUriAction = {
  type: "uri";
  linkUri: string;
  area: LineImagemapArea;
};

export type LineImagemapMessageAction = {
  type: "message";
  text: string;
  area: LineImagemapArea;
};

export type LineImagemapAction = LineImagemapUriAction | LineImagemapMessageAction;

export type LineImagemapMessage = {
  type: "imagemap";
  baseUrl: string;
  altText: string;
  baseSize: { width: number; height: number };
  actions: LineImagemapAction[];
};

export type LineMessage = LineTextMessage | LineFlexMessage | LineImageMessage | LineImagemapMessage;

// ─── Builder State (not sent to API) ───
export type MessageType = "text" | "bubble" | "carousel" | "image" | "imagemap";

export type ButtonBuilderState = {
  label: string;
  uri: string;
  style: "primary" | "secondary" | "link";
};

export type BubbleBuilderState = {
  heroImageUrl: string;
  heroAspectRatio: string;
  title: string;
  description: string;
  buttons: ButtonBuilderState[];
};

export const EMPTY_BUBBLE_STATE: BubbleBuilderState = {
  heroImageUrl: "",
  heroAspectRatio: "20:13",
  title: "",
  description: "",
  buttons: [],
};
