"use client";

import React from "react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ message = "読み込み中...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}

