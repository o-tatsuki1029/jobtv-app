"use client";

import React from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
  color?: "blue" | "green" | "purple";
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className = "" }: TabsProps) {
  const colorClasses = {
    blue: {
      active: "bg-blue-600 text-white border-b-2 border-blue-600",
      inactive: "text-blue-600 hover:bg-blue-50",
      badge: "bg-blue-100 text-blue-700"
    },
    green: {
      active: "bg-green-600 text-white border-b-2 border-green-600",
      inactive: "text-green-600 hover:bg-green-50",
      badge: "bg-green-100 text-green-700"
    },
    purple: {
      active: "bg-purple-600 text-white border-b-2 border-purple-600",
      inactive: "text-purple-600 hover:bg-purple-50",
      badge: "bg-purple-100 text-purple-700"
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const colors = colorClasses[tab.color || "blue"];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
                activeTab === tab.id ? colors.active : colors.inactive
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    activeTab === tab.id ? "bg-white/20 text-white" : colors.badge
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

