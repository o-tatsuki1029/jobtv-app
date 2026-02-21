"use client";

import React, { useState, useEffect } from "react";
import { getCharCountText, getCharCountClassName } from "@jobtv-app/shared/utils/char-count";
import { validateKatakana } from "@jobtv-app/shared/utils/validation";
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
  validateKatakana?: boolean;
  onValidationChange?: (isValid: boolean) => void;
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
  disabled = false,
  validateKatakana: shouldValidateKatakana = false,
  onValidationChange
}: StudioFormFieldProps) {
  const [katakanaError, setKatakanaError] = useState<string | null>(null);
  
  const currentLength = value?.length || 0;
  const charCountText = showCharCount ? getCharCountText(currentLength, maxLength) : null;
  const charCountClassName = showCharCount ? getCharCountClassName(currentLength, maxLength) : "";

  // カタカナバリデーション
  useEffect(() => {
    if (shouldValidateKatakana && value !== undefined) {
      const validationError = validateKatakana(value, label);
      setKatakanaError(validationError);
      
      if (onValidationChange) {
        onValidationChange(validationError === null);
      }
    }
  }, [value, shouldValidateKatakana, label, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  // エラー表示の優先順位: 外部エラー > カタカナバリデーションエラー
  const displayError = error || katakanaError;

  return (
    <div className="space-y-2">
      <StudioLabel htmlFor={name} required={required}>
        {label}
      </StudioLabel>

      {/* maxLength は入力には付けない（入力は受け付ける）。文字数表示とバリデーションで制限超過時はエラーとする */}
      {type === "textarea" ? (
        <StudioTextarea
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          error={!!displayError}
          disabled={disabled}
        />
      ) : (
        <StudioInput
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          error={!!displayError}
          disabled={disabled}
        />
      )}

      <div className="flex items-center justify-between">
        {displayError ? (
          <p className="text-[10px] text-red-500 font-bold">{displayError}</p>
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
