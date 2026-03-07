"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

interface PaginationBarProps {
  /** 0-indexed ページ番号 */
  page: number;
  pageSize: number;
  /** DB またはクライアント側の総件数。null の場合は「次へ」ボタンの判定を itemCount < pageSize で行う */
  totalCount: number | null;
  /** 現在ページに実際に表示されているアイテム数 */
  itemCount: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** 単位の文字列（デフォルト: "件"） */
  unit?: string;
}

export default function PaginationBar({
  page,
  pageSize,
  totalCount,
  itemCount,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  unit = "件",
}: PaginationBarProps) {
  const from = itemCount > 0 ? page * pageSize + 1 : 0;
  const to = page * pageSize + itemCount;
  const total = totalCount ?? 0;
  const totalPages = totalCount !== null ? Math.max(1, Math.ceil(total / pageSize)) : null;

  const hasPrev = page > 0;
  const hasNext = totalCount !== null ? to < total : itemCount >= pageSize;

  return (
    <div className="grid grid-cols-3 items-center text-sm text-gray-500">
      {/* 左：空白（右側と対称にするためのスペーサー） */}
      <div />

      {/* 中央：件数表示 */}
      <div className="flex justify-center">
        <span className="tabular-nums">
          {itemCount > 0
            ? `${from}〜${to} ${unit} / 全${total}${unit}`
            : `全${total}${unit}`}
        </span>
      </div>

      {/* 右：表示件数 + ページネーション */}
      <div className="flex items-center justify-end gap-2">
        {/* 表示件数選択 */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none pl-3 pr-7 py-1.5 text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}件</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ページネーション */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden divide-x divide-gray-200">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="前のページ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-600 select-none tabular-nums bg-gray-50">
            {page + 1}{totalPages !== null ? ` / ${totalPages}` : ""}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="次のページ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
