"use client";

import { useEffect } from "react";
import type { LineImageMessage } from "@/types/line-flex.types";
import { buildImageMessage } from "@/lib/line-flex-builder";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";

interface ImageMessageBuilderProps {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onMessageChange: (message: LineImageMessage | null) => void;
  onUploadImage: (file: File) => Promise<{ data: string | null; error: string | null }>;
}

export function ImageMessageBuilder({
  imageUrl,
  onImageUrlChange,
  onMessageChange,
  onUploadImage,
}: ImageMessageBuilderProps) {
  useEffect(() => {
    if (imageUrl) {
      onMessageChange(buildImageMessage(imageUrl));
    } else {
      onMessageChange(null);
    }
  }, [imageUrl, onMessageChange]);

  return (
    <div>
      <StudioLabel required>画像</StudioLabel>
      <StudioImageUpload
        label="配信画像"
        type="cover"
        currentUrl={imageUrl || undefined}
        onUploadComplete={onImageUrlChange}
        customUploadFunction={onUploadImage}
        aspectRatio="wide"
        helperText="JPEG/PNG、10MB以下。LINEトーク画面に画像として表示されます。"
      />
    </div>
  );
}
