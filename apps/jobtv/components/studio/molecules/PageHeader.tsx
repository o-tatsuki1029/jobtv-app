"use client";

import React, { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, action, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {description && <p className="text-gray-500 font-medium">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

