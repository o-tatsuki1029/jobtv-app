"use client";

import type { MessageType } from "@/types/line-flex.types";
import Tabs from "@/components/studio/molecules/Tabs";

const MESSAGE_TABS = [
  { id: "text", label: "テキスト", color: "green" as const },
  { id: "bubble", label: "カード", color: "green" as const },
  { id: "carousel", label: "カルーセル", color: "green" as const },
  { id: "image", label: "画像", color: "green" as const },
  { id: "imagemap", label: "Imagemap", color: "green" as const },
];

interface MessageTypeSelectorProps {
  value: MessageType;
  onChange: (type: MessageType) => void;
}

export function MessageTypeSelector({ value, onChange }: MessageTypeSelectorProps) {
  return (
    <Tabs
      tabs={MESSAGE_TABS}
      activeTab={value}
      onTabChange={(id) => onChange(id as MessageType)}
    />
  );
}
