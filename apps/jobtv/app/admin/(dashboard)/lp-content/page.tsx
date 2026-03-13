"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Tabs from "@/components/studio/molecules/Tabs";
import LpSampleVideosContent from "@/components/admin/LpSampleVideosContent";
import LpFaqContent from "@/components/admin/LpFaqContent";
import LpCompanyLogosContent from "@/components/admin/LpCompanyLogosContent";
import LpScrollBannerContent from "@/components/admin/LpScrollBannerContent";

type TabId = "videos" | "faq" | "logos" | "banner";

const TAB_OPTIONS: { id: TabId; label: string }[] = [
  { id: "videos", label: "サンプル動画" },
  { id: "faq", label: "FAQ" },
  { id: "logos", label: "企業ロゴ" },
  { id: "banner", label: "スクロールバナー" }
];

export default function LpContentPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = (searchParams.get("tab") as TabId) || "videos";
  const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">LP管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          法人LP（採用マーケティング支援）のコンテンツを管理できます。
        </p>
      </div>

      <Tabs
        tabs={TAB_OPTIONS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {activeTab === "videos" && <LpSampleVideosContent />}
      {activeTab === "faq" && <LpFaqContent />}
      {activeTab === "logos" && <LpCompanyLogosContent />}
      {activeTab === "banner" && <LpScrollBannerContent />}
    </div>
  );
}
