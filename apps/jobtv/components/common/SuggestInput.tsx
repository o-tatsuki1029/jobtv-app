"use client";

import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@jobtv-app/shared/utils/cn";
import { MainThemeContext } from "@/components/theme/PageThemeContext";

export interface SuggestItem {
  label: string;  // ドロップダウンに表示するテキスト
  value: string;  // 選択時にインプットにセットするテキスト
  meta?: Record<string, string | null | undefined>;  // school_kcode などの追加データ
}

interface SuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: SuggestItem) => void;
  fetchSuggestions: (query: string) => Promise<SuggestItem[]>;
  placeholder?: string;
  className?: string;
  name?: string;   // フォーム送信用 name 属性
  disabled?: boolean;
  hasError?: boolean;
  showOnFocus?: boolean;  // フォーカス時に空クエリでもサジェストを表示する
  cacheScope?: string;    // この値が変わるとキャッシュをクリアする（例: school_kcode）
}

const DEBOUNCE_MS = 300;

export default function SuggestInput({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder,
  className,
  name,
  disabled,
  hasError,
  showOnFocus,
  cacheScope,
}: SuggestInputProps) {
  // MainThemeProvider がない場合（auth ページ等）はライトテーマにフォールバック
  const themeCtx = useContext(MainThemeContext);
  const isDark = themeCtx?.theme === "dark";

  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, SuggestItem[]>>(new Map());
  const prevScopeRef = useRef(cacheScope);

  // cacheScope が変わったらキャッシュをクリア
  if (prevScopeRef.current !== cacheScope) {
    prevScopeRef.current = cacheScope;
    cacheRef.current.clear();
    setSuggestions([]);
    setOpen(false);
  }

  const runFetch = useCallback(
    async (q: string, allowEmpty = false) => {
      if (!allowEmpty && !q.trim()) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const cacheKey = q.trim();
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setSuggestions(cached);
        setOpen(cached.length > 0);
        setActiveIndex(-1);
        return;
      }
      setLoading(true);
      try {
        const results = await fetchSuggestions(q);
        cacheRef.current.set(cacheKey, results);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchSuggestions]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(v), DEBOUNCE_MS);
  };

  const handleSelect = (item: SuggestItem) => {
    onChange(item.value);
    onSelect?.(item);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // コンテナ内のクリックなら閉じない
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const inputBase = cn(
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500",
    isDark
      ? "bg-gray-900 border-gray-700 text-white placeholder-gray-600"
      : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400",
    hasError && (isDark ? "border-red-500 bg-red-950/30" : "border-red-500 bg-red-50/50"),
    disabled && (isDark ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"),
    className
  );

  const dropdownBase = cn(
    "absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-y-auto max-h-48",
    isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
  );

  const itemBase = (active: boolean) =>
    cn(
      "px-3 py-2 text-sm cursor-pointer",
      active
        ? isDark
          ? "bg-gray-700 text-white"
          : "bg-red-50 text-gray-900"
        : isDark
          ? "text-gray-200 hover:bg-gray-800"
          : "text-gray-700 hover:bg-gray-50"
    );

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (showOnFocus) {
            runFetch(value, true);
          } else if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={inputBase}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
      )}
      {open && suggestions.length > 0 && (
        <ul className={dropdownBase} role="listbox">
          {suggestions.map((item, i) => (
            <li
              key={`${item.value}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={itemBase(i === activeIndex)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
