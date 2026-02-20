"use client";

import React from "react";
import { Filter } from "lucide-react";
import StudioLabel from "../atoms/StudioLabel";
import StudioSelect from "../atoms/StudioSelect";

interface FilterOption {
  value: string;
  label: string;
}

// ステータスのラベル定義
const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  submitted: "申請中",
  active: "公開中",
  closed: "非公開"
};

export interface ListFilterSectionProps {
  /** 公開ステータスフィルター */
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  /** @deprecated availableStatusesを使用してください */
  statusOptions?: FilterOption[];
  /** データから抽出された利用可能なステータス */
  availableStatuses?: Array<"draft" | "submitted" | "active" | "closed">;

  /** 卒年度フィルター（データから自動抽出されたオプション） */
  graduationYearFilter?: string;
  onGraduationYearFilterChange?: (value: string) => void;
  availableGraduationYears?: number[];

  className?: string;
}

/**
 * 求人・説明会一覧の共通フィルターコンポーネント
 * - 公開ステータスフィルター
 * - 卒年度フィルター（データがある場合のみ表示）
 */
export default function ListFilterSection({
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  availableStatuses = [],
  graduationYearFilter,
  onGraduationYearFilterChange,
  availableGraduationYears = [],
  className = ""
}: ListFilterSectionProps) {
  const showGraduationYearFilter =
    availableGraduationYears.length > 0 && graduationYearFilter !== undefined && onGraduationYearFilterChange;

  // availableStatusesが指定されている場合はそれを使用、そうでなければstatusOptionsを使用
  const computedStatusOptions: FilterOption[] =
    availableStatuses.length > 0
      ? [
          { value: "all", label: "すべて" },
          ...availableStatuses.map((status) => ({
            value: status,
            label: STATUS_LABELS[status] || status
          }))
        ]
      : statusOptions || [{ value: "all", label: "すべて" }];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">フィルター</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* 公開ステータスフィルター */}
          <div className="flex-1 min-w-[180px]">
            <StudioLabel hideBadge>公開ステータス</StudioLabel>
            <StudioSelect value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
              {computedStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </StudioSelect>
          </div>

          {/* 卒年度フィルター */}
          {showGraduationYearFilter && (
            <div className="flex-1 min-w-[140px]">
              <StudioLabel hideBadge>卒年度</StudioLabel>
              <StudioSelect value={graduationYearFilter} onChange={(e) => onGraduationYearFilterChange(e.target.value)}>
                <option value="all">全て</option>
                {availableGraduationYears.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}年卒
                  </option>
                ))}
              </StudioSelect>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

