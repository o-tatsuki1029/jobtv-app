"use client";

import React from "react";
import StudioLabel from "../atoms/StudioLabel";
import StudioSelect from "../atoms/StudioSelect";
import { PREFECTURES } from "@/constants/prefectures";

interface PrefectureSelectProps {
  label?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string | boolean;
  required?: boolean;
  disabled?: boolean;
}

export default function PrefectureSelect({
  label = "都道府県",
  name = "prefecture",
  value,
  onChange,
  error,
  required = false,
  disabled = false
}: PrefectureSelectProps) {
  return (
    <div className="space-y-2">
      <StudioLabel htmlFor={name} required={required}>
        {label}
      </StudioLabel>
      <StudioSelect
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        error={!!error}
        disabled={disabled}
      >
        <option value="">選択してください</option>
        {PREFECTURES.map((pref) => (
          <option key={pref} value={pref}>
            {pref}
          </option>
        ))}
      </StudioSelect>
      {typeof error === "string" && error && (
        <p className="text-[10px] text-red-500 font-bold">{error}</p>
      )}
    </div>
  );
}

