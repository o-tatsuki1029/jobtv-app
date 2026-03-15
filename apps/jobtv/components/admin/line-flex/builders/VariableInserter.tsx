"use client";

import { useState, useRef, useEffect } from "react";
import { LINE_MESSAGE_VARIABLES } from "@/lib/line-message-variables";
import { Variable } from "lucide-react";

interface VariableInserterProps {
  /** テキスト入力への参照を使わず、直接値を操作するシンプル版 */
  onInsert: (variable: string) => void;
}

export function VariableInserter({ onInsert }: VariableInserterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        title="変数を挿入"
      >
        <Variable className="h-3.5 w-3.5" />
        変数を挿入
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            送信先ごとに置換されます
          </p>
          {LINE_MESSAGE_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                onInsert(`{{${v.key}}}`);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">{v.label}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                {`{{${v.key}}}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
