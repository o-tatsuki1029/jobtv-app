"use client";

import React from "react";

interface StudioBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  icon?: React.ReactNode;
}

export default function StudioBadge({ children, variant = "neutral", icon }: StudioBadgeProps) {
  const baseStyles = "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border";

  const variants = {
    success: "bg-green-50 text-green-700 border-green-100",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-100",
    error: "bg-red-50 text-red-700 border-red-100",
    info: "bg-blue-50 text-blue-700 border-blue-100",
    neutral: "bg-gray-50 text-gray-700 border-gray-100"
  };

  return (
    <span className={`${baseStyles} ${variants[variant]}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
