"use client";

import React from "react";

interface LineMessagePreviewProps {
  messageText: string;
}

/** LINE 公式アカウントの送信吹き出し色（薄い緑） */
const LINE_BUBBLE_BG = "#D4F4DD";

/**
 * 配信文の LINE 風吹き出しプレビュー。右下に追従表示用。公式アカウント送信を模した表示。
 */
export function LineMessagePreview({ messageText }: LineMessagePreviewProps) {
  const trimmed = messageText.trim();

  return (
    <div className="rounded-xl border-2 border-[#06C755] bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#06C755] text-xs font-bold text-white">
          L
        </span>
        <p className="text-xs font-semibold text-gray-700">プレビュー</p>
      </div>
      <div className="p-3">
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm"
            style={{ wordBreak: "break-word", backgroundColor: LINE_BUBBLE_BG }}
          >
            {trimmed ? (
              <p className="whitespace-pre-wrap text-sm text-gray-900">{trimmed}</p>
            ) : (
              <p className="text-sm text-gray-500">メッセージを入力するとここに表示されます</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
