"use client";

import React from "react";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export default function ErrorMessage({ message, className = "" }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg ${className}`}>
      {message}
    </div>
  );
}

