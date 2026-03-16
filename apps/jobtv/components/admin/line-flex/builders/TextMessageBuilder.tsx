"use client";

import { useRef } from "react";
import { VariableInserter } from "./VariableInserter";

const LINE_TEXT_MAX_LENGTH = 5000;

interface TextMessageBuilderProps {
  value: string;
  onChange: (text: string) => void;
}

export function TextMessageBuilder({
  value,
  onChange,
}: TextMessageBuilderProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue =
        value.slice(0, start) + variable + value.slice(end);
      onChange(newValue.slice(0, LINE_TEXT_MAX_LENGTH));
      // カーソルを挿入位置の後ろに
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd =
          start + variable.length;
        el.focus();
      });
    } else {
      onChange((value + variable).slice(0, LINE_TEXT_MAX_LENGTH));
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          メッセージ（テキスト）
        </label>
        <VariableInserter onInsert={insertVariable} />
      </div>
      <textarea
        ref={textareaRef}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm min-h-[120px] text-gray-900"
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, LINE_TEXT_MAX_LENGTH))
        }
        placeholder="配信するメッセージを入力してください&#10;{{last_name}}さん のように変数を使えます"
        maxLength={LINE_TEXT_MAX_LENGTH}
      />
      <p className="mt-1 text-xs text-gray-500">
        {value.length} / {LINE_TEXT_MAX_LENGTH} 文字
      </p>
    </div>
  );
}
