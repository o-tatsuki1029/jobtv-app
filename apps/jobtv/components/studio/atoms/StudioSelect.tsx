"use client";

import React from "react";

interface StudioSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export default function StudioSelect({ error = false, className = "", ...props }: StudioSelectProps) {
  const baseStyles =
    "w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm transition-all appearance-none cursor-pointer";
  const borderStyles = error ? "border-red-500" : "border-gray-200 focus:border-black/10";

  return (
    <div className="relative">
      <select className={`${baseStyles} ${borderStyles} ${className}`} {...props} />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

