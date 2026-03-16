"use client";

import Image from "next/image";
import type { LineMessage } from "@/types/line-flex.types";
import { FlexBubble } from "./FlexBubble";
import { FlexCarousel } from "./FlexCarousel";
import { FlexImagemap } from "./FlexImagemap";
import { BUBBLE_MAX_WIDTH } from "./line-flex-constants";
import { replaceMessageVariables } from "@/lib/line-message-variables";
import { LINE_MESSAGE_VARIABLES } from "@/lib/line-message-variables";

/** プレビュー用: 変数をサンプル値に置換してから描画 */
function previewMessage(message: LineMessage): LineMessage {
  const exampleMap: Record<string, string> = {};
  for (const v of LINE_MESSAGE_VARIABLES) {
    exampleMap[v.key] = v.example;
  }
  return replaceMessageVariables(message, exampleMap);
}

export function FlexRenderer({ message }: { message: LineMessage }) {
  const msg = previewMessage(message);

  if (msg.type === "text") {
    return (
      <div
        style={{
          display: "inline-block",
          backgroundColor: "#ffffff",
          maxWidth: "100%",
          wordBreak: "break-word",
          borderRadius: "4px 16px 16px 16px",
          padding: "12px 16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <p
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 15,
            lineHeight: 1.55,
            color: "#111111",
            margin: 0,
          }}
        >
          {msg.text}
        </p>
      </div>
    );
  }

  if (msg.type === "flex") {
    const c = msg.contents;
    if (c.type === "bubble") {
      return <FlexBubble bubble={c} />;
    }
    return <FlexCarousel carousel={c} />;
  }

  if (msg.type === "image") {
    return (
      <div
        style={{
          maxWidth: BUBBLE_MAX_WIDTH,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <Image
          src={msg.originalContentUrl}
          alt=""
          width={300}
          height={200}
          unoptimized
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
    );
  }

  if (msg.type === "imagemap") {
    return <FlexImagemap message={msg} />;
  }

  return null;
}
