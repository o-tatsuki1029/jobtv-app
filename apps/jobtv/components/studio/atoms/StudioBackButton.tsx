"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudioBackButtonProps {
  href: string;
  className?: string;
}

export default function StudioBackButton({ href, className = "" }: StudioBackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      title="一覧に戻る"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );
}

