"use client";

import React from "react";

interface StudioLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

export default function StudioLabel({ children, required = false, className = "", ...props }: StudioLabelProps) {
  return (
    <label className={`block text-sm font-bold text-gray-700 flex items-center gap-1 ${className}`} {...props}>
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}
