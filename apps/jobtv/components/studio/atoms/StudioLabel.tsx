"use client";

import React from "react";
import StudioBadge from "./StudioBadge";

interface StudioLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

export default function StudioLabel({ children, required = false, className = "", ...props }: StudioLabelProps) {
  return (
    <label className={`block text-sm font-bold text-gray-700 flex items-center gap-2 ${className}`} {...props}>
      {children}
      {required ? <StudioBadge variant="error">必須</StudioBadge> : <StudioBadge variant="neutral">任意</StudioBadge>}
    </label>
  );
}
