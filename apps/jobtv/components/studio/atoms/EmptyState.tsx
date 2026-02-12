"use client";

import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({ title, description, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 ${className}`}>
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-2">{description}</p>}
    </div>
  );
}

