"use client";

import React from "react";

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export default function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}
