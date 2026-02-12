"use client";

import React from "react";
import { getCharCountText, getCharCountClassName } from "@jobtv-app/shared/utils/char-count";
import StudioLabel from "../atoms/StudioLabel";
import StudioInput from "../atoms/StudioInput";
import StudioTextarea from "../atoms/StudioTextarea";

interface StudioFormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "textarea";
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  disabled?: boolean;
}

export default function StudioFormField({
  label,
  name,
  type = "text",
  required = false,
  value,
  onChange,
  placeholder,
  rows = 5,
  error,
  helperText,
  maxLength,
  showCharCount = false,
  disabled = false
}: StudioFormFieldProps) {
  const currentLength = value?.length || 0;
  const charCountText = showCharCount ? getCharCountText(currentLength, maxLength) : null;
  const charCountClassName = showCharCount ? getCharCountClassName(currentLength, maxLength) : "";

  return (
    <div className="space-y-2">
      <StudioLabel htmlFor={name} required={required}>
        {label}
      </StudioLabel>

      {type === "textarea" ? (
        <StudioTextarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          error={!!error}
          disabled={disabled}
        />
      ) : (
        <StudioInput
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          error={!!error}
          disabled={disabled}
        />
      )}

      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-[10px] text-red-500 font-bold">{error}</p>
        ) : helperText ? (
          <p className="text-[10px] text-gray-400">{helperText}</p>
        ) : (
          <div />
        )}
        {charCountText && (
          <p className={`text-[10px] font-bold ${charCountClassName}`}>
            {charCountText}
          </p>
        )}
      </div>
    </div>
  );
}
