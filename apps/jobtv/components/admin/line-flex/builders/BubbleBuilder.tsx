"use client";

import { useEffect } from "react";
import type { BubbleBuilderState, LineFlexMessage } from "@/types/line-flex.types";
import { buildBubbleFromState, buildFlexMessage } from "@/lib/line-flex-builder";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import { BubbleFormFields } from "./BubbleFormFields";

interface BubbleBuilderProps {
  bubbleState: BubbleBuilderState;
  altText: string;
  onBubbleStateChange: (state: BubbleBuilderState) => void;
  onAltTextChange: (text: string) => void;
  onMessageChange: (message: LineFlexMessage | null) => void;
  onUploadImage: (file: File) => Promise<{ data: string | null; error: string | null }>;
}

export function BubbleBuilder({
  bubbleState,
  altText,
  onBubbleStateChange,
  onAltTextChange,
  onMessageChange,
  onUploadImage,
}: BubbleBuilderProps) {
  useEffect(() => {
    const hasContent =
      bubbleState.heroImageUrl ||
      bubbleState.title ||
      bubbleState.description ||
      bubbleState.buttons.length > 0;

    if (!hasContent) {
      onMessageChange(null);
      return;
    }

    const bubble = buildBubbleFromState(bubbleState);
    onMessageChange(buildFlexMessage(bubble, altText));
  }, [bubbleState, altText, onMessageChange]);

  return (
    <div className="space-y-4">
      <div>
        <StudioLabel required>代替テキスト</StudioLabel>
        <StudioInput
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value.slice(0, 400))}
          placeholder="通知やトーク一覧に表示されるテキスト"
          maxLength={400}
        />
        <p className="mt-1 text-xs text-gray-500">{altText.length}/400</p>
      </div>
      <BubbleFormFields
        value={bubbleState}
        onChange={onBubbleStateChange}
        onUploadImage={onUploadImage}
      />
    </div>
  );
}
