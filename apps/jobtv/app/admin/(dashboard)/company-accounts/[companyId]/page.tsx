"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import Tabs from "@/components/studio/molecules/Tabs";
import {
  getCompanyById,
  getCompanyRecruiters,
} from "@/lib/actions/company-account-actions";
import type { Tables } from "@jobtv-app/shared/types";

import CompanyInfoTab from "./_components/CompanyInfoTab";
import CompanyPageTab from "./_components/CompanyPageTab";
import JobsTab from "./_components/JobsTab";
import SessionsTab from "./_components/SessionsTab";
import VideosTab from "./_components/VideosTab";
import RecruitersTab from "./_components/RecruitersTab";

type Company = Tables<"companies">;
type Profile = Tables<"profiles">;

const TABS = [
  { id: "info", label: "企業情報", color: "black" as const },
  { id: "page", label: "企業ページ", color: "black" as const },
  { id: "jobs", label: "求人", color: "black" as const },
  { id: "sessions", label: "説明会", color: "black" as const },
  { id: "videos", label: "動画", color: "black" as const },
  { id: "recruiters", label: "リクルーター", color: "black" as const },
];

export default function CompanyEditPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [recruiters, setRecruiters] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [companyResult, recruitersResult] = await Promise.all([
        getCompanyById(companyId),
        getCompanyRecruiters(companyId),
      ]);

      if (companyResult.data) {
        setCompany(companyResult.data);
      }

      if (recruitersResult.data) {
        setRecruiters(recruitersResult.data);
      }

      setLoading(false);
    };

    load();
  }, [companyId]);

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <StudioBadge variant="success">有効</StudioBadge>;
    } else if (status === "closed") {
      return <StudioBadge variant="neutral">無効</StudioBadge>;
    }
    return <StudioBadge variant="neutral">未設定</StudioBadge>;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <StudioButton
          variant="outline"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/admin/company-accounts")}
        >
          一覧に戻る
        </StudioButton>
        <p className="text-gray-500">企業情報が見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <StudioButton
          variant="outline"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/admin/company-accounts")}
        >
          一覧に戻る
        </StudioButton>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight">{company.name}</h1>
          {getStatusBadge(company.status)}
        </div>
      </div>

      {/* タブ */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* タブコンテンツ */}
      <div>
        {activeTab === "info" && (
          <CompanyInfoTab
            company={company}
            onCompanyUpdate={(c) => setCompany(c)}
          />
        )}
        {activeTab === "page" && (
          <CompanyPageTab companyId={companyId} />
        )}
        {activeTab === "jobs" && (
          <JobsTab companyId={companyId} />
        )}
        {activeTab === "sessions" && (
          <SessionsTab companyId={companyId} />
        )}
        {activeTab === "videos" && (
          <VideosTab companyId={companyId} />
        )}
        {activeTab === "recruiters" && (
          <RecruitersTab
            companyId={companyId}
            recruiters={recruiters}
            onRecruitersUpdate={setRecruiters}
          />
        )}
      </div>
    </div>
  );
}
