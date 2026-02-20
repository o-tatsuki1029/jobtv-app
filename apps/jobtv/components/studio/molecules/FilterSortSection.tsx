"use client";

import React from "react";
import { Filter } from "lucide-react";
import StudioLabel from "../atoms/StudioLabel";
import StudioSelect from "../atoms/StudioSelect";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSortSectionProps {
  filters?: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
  }>;
  className?: string;
}

/**
 * @deprecated FilterSortSection は ListFilterSection に移行してください
 */
export default function FilterSortSection({ filters = [], className = "" }: FilterSortSectionProps) {
  if (filters.length === 0) return null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">フィルター</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {filters.map((filter, index) => (
            <div key={index} className="flex-1 min-w-[200px]">
              <StudioLabel hideBadge>{filter.label}</StudioLabel>
              <StudioSelect value={filter.value} onChange={(e) => filter.onChange(e.target.value)}>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </StudioSelect>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

