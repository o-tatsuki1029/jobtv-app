"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LineMessage } from "@/types/line-flex.types";
import { validateFlexMessageJson } from "@/lib/line-flex-builder";
import { Download, Upload } from "lucide-react";

interface JsonEditorProps {
  value: string;
  onChange: (json: string) => void;
  onValidMessage: (message: LineMessage | null) => void;
}

export function JsonEditor({ value, onChange, onValidMessage }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 500ms debounce for validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!value.trim()) {
        setError(null);
        onValidMessage(null);
        return;
      }

      const result = validateFlexMessageJson(value);
      if (result.valid) {
        setError(null);
        onValidMessage(result.message);
      } else {
        setError(result.error);
        onValidMessage(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, onValidMessage]);

  const handleExport = useCallback(() => {
    const blob = new Blob([value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line-message.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [value]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          onChange(text);
        }
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-imported
      e.target.value = "";
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          エクスポート
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          インポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='{"type": "flex", "altText": "...", "contents": { ... }}'
        rows={20}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-[#06C755] focus:outline-none focus:ring-1 focus:ring-[#06C755]"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
