"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@jobtv-app/shared/utils/cn";

export interface OptionGroup {
  label: string;
  options: string[];
}

interface MultiSelectDropdownProps {
  /** フラットなオプション一覧（groups 未指定時に使用） */
  options?: string[];
  /** グループ付きオプション（地方別等）。指定時は options より優先 */
  groups?: OptionGroup[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export default function MultiSelectDropdown({
  options,
  groups,
  selected,
  onChange,
  placeholder = "選択してください",
  className,
  hasError,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  function toggleGroup(groupOptions: string[]) {
    const allSelected = groupOptions.every((o) => selected.includes(o));
    if (allSelected) {
      onChange(selected.filter((v) => !groupOptions.includes(v)));
    } else {
      const toAdd = groupOptions.filter((o) => !selected.includes(o));
      onChange([...selected, ...toAdd]);
    }
  }

  const displayText = selected.length > 0 ? selected.join("、") : placeholder;

  // groups が指定されていればグループ表示、なければフラット表示
  const resolvedGroups: OptionGroup[] | null = groups ?? null;
  const flatOptions = resolvedGroups ? null : (options ?? []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all flex items-center justify-between",
          hasError && "border-red-500 bg-red-50/50",
          className
        )}
      >
        <span className={cn("truncate", selected.length === 0 && "text-gray-400")}>
          {displayText}
        </span>
        <svg
          className={cn("w-4 h-4 shrink-0 ml-2 text-gray-400 transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {resolvedGroups
            ? resolvedGroups.map((group) => {
                const allSelected = group.options.every((o) => selected.includes(o));
                const someSelected = !allSelected && group.options.some((o) => selected.includes(o));
                return (
                  <div key={group.label}>
                    <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 cursor-pointer sticky top-0">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={() => toggleGroup(group.options)}
                        className="h-4 w-4 rounded border-gray-300 text-red-500 accent-red-500"
                      />
                      {group.label}
                    </label>
                    {group.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 pl-8 pr-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => toggle(opt)}
                          className="h-4 w-4 rounded border-gray-300 text-red-500 accent-red-500"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                );
              })
            : flatOptions?.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="h-4 w-4 rounded border-gray-300 text-red-500 accent-red-500"
                  />
                  {opt}
                </label>
              ))}
        </div>
      )}
    </div>
  );
}
