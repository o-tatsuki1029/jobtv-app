import type {
  BubbleBuilderState,
  LineFlexBubble,
  LineFlexMessage,
  LineFlexComponent,
  LineImageMessage,
  LineImagemapAction,
  LineImagemapMessage,
  LineMessage,
} from "@/types/line-flex.types";

/** BubbleBuilderState → LINE Flex Bubble JSON */
export function buildBubbleFromState(state: BubbleBuilderState): LineFlexBubble {
  const bubble: LineFlexBubble = { type: "bubble" };

  // Hero image
  if (state.heroImageUrl) {
    bubble.hero = {
      type: "image",
      url: state.heroImageUrl,
      size: "full",
      aspectRatio: state.heroAspectRatio || "20:13",
      aspectMode: "cover",
    };
  }

  // Body (title + description)
  const bodyContents: LineFlexComponent[] = [];
  if (state.title) {
    bodyContents.push({
      type: "text",
      text: state.title,
      weight: "bold",
      size: "xl",
      wrap: true,
    });
  }
  if (state.description) {
    bodyContents.push({
      type: "text",
      text: state.description,
      size: "sm",
      color: "#999999",
      wrap: true,
      ...(state.title ? { margin: "md" } : {}),
    } as LineFlexComponent);
  }
  if (bodyContents.length > 0) {
    bubble.body = {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
    };
  }

  // Footer (buttons)
  if (state.buttons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: state.buttons.map((btn) => ({
        type: "button" as const,
        action: { type: "uri" as const, label: btn.label || "ボタン", uri: btn.uri || "https://example.com" },
        style: btn.style || "primary",
        ...(btn.style === "primary" ? { color: "#06C755" } : {}),
        height: "sm" as const,
      })),
    };
  }

  return bubble;
}

/** Bubble + altText → LineFlexMessage */
export function buildFlexMessage(
  bubble: LineFlexBubble,
  altText: string
): LineFlexMessage {
  return {
    type: "flex",
    altText: altText || "メッセージ",
    contents: bubble,
  };
}

/** Bubbles[] + altText → Carousel LineFlexMessage */
export function buildCarouselMessage(
  bubbles: LineFlexBubble[],
  altText: string
): LineFlexMessage {
  return {
    type: "flex",
    altText: altText || "メッセージ",
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

/** URL → LineImageMessage */
export function buildImageMessage(url: string): LineImageMessage {
  return {
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url,
  };
}

/** Imagemap メッセージを構築 */
export function buildImagemapMessage(
  baseUrl: string,
  altText: string,
  actions: LineImagemapAction[],
  baseSize: { width: number; height: number } = { width: 1040, height: 1040 }
): LineImagemapMessage {
  return { type: "imagemap", baseUrl, altText, baseSize, actions };
}

/** JSON文字列をパースしてLineMessage として妥当か検証する */
export function validateFlexMessageJson(
  json: string
): { valid: true; message: LineMessage } | { valid: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, error: "JSONの構文が正しくありません" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: "JSONはオブジェクトである必要があります" };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.type || typeof obj.type !== "string") {
    return { valid: false, error: "type フィールドが必要です" };
  }

  const validTypes = ["text", "flex", "image", "imagemap"];
  if (!validTypes.includes(obj.type)) {
    return {
      valid: false,
      error: `type は ${validTypes.join(" / ")} のいずれかである必要があります（現在: "${obj.type}"）`,
    };
  }

  if (obj.type === "text") {
    if (!obj.text || typeof obj.text !== "string") {
      return { valid: false, error: "text メッセージには text フィールドが必要です" };
    }
  }

  if (obj.type === "flex") {
    if (!obj.contents || typeof obj.contents !== "object") {
      return { valid: false, error: "flex メッセージには contents フィールドが必要です" };
    }
  }

  if (obj.type === "image") {
    if (!obj.originalContentUrl || typeof obj.originalContentUrl !== "string") {
      return {
        valid: false,
        error: "image メッセージには originalContentUrl フィールドが必要です",
      };
    }
  }

  return { valid: true, message: obj as LineMessage };
}
