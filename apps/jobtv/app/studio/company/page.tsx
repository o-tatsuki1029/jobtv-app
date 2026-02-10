"use client";

import React, { useState } from "react";
import {
  Building,
  Image as ImageIcon,
  Save,
  Eye,
  Globe,
  Loader2,
  CheckCircle2,
  Video,
  Copy,
  Check
} from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioVideoList from "@/components/studio/molecules/StudioVideoList";
import StudioSnsFields from "@/components/studio/molecules/StudioSnsFields";
import StudioBenefitsSection from "@/components/studio/molecules/StudioBenefitsSection";
import SectionCard from "@/components/studio/molecules/SectionCard";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

export default function CompanyPageManagement() {
  const {
    company,
    companyId,
    isLoading,
    isSaving,
    saveStatus,
    errorMessage,
    snsAccountNames,
    setCompany,
    setSnsAccountNames,
    handleSave,
    setErrorMessage,
    setSaveStatus,
    hasChanges
  } = useCompanyProfile();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isCopied, setIsCopied] = useState(false);
  const [taglineError, setTaglineError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // キャッチコピーのバリデーション（32字以内）
    if (name === "tagline") {
      if (value.length > 32) {
        setTaglineError("キャッチコピーは32字以内で入力してください");
      } else {
        setTaglineError(null);
      }
    }

    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handleSnsChange = (platform: "x" | "instagram" | "tiktok" | "youtube", value: string) => {
    setSnsAccountNames((prev) => ({ ...prev, [platform]: value }));
  };

  const handleVideoError = (error: string) => {
    setErrorMessage(error);
    setSaveStatus("error");
  };

  const handleCopyUrl = async () => {
    if (!companyId) return;

    const companyUrl = `${window.location.origin}/company/${companyId}`;
    try {
      await navigator.clipboard.writeText(companyUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      setErrorMessage("URLのコピーに失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={company}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">企業ページ管理</h1>
          <p className="text-gray-500 font-medium">求職者に表示される企業プロフィールの編集と公開設定を行います。</p>
        </div>
        <div className="flex gap-2">
          <StudioButton variant="outline" icon={<Eye className="w-4 h-4" />} onClick={() => setIsPreviewOpen(true)}>
            プレビュー
          </StudioButton>
          <StudioButton
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
            disabled={isSaving || !hasChanges() || !!taglineError}
          >
            {isSaving ? "保存中..." : "変更を保存"}
          </StudioButton>
        </div>
      </div>

      {/* 保存ステータス表示 */}
      {saveStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-bold text-green-800">保存が完了しました</p>
        </div>
      )}

      {(saveStatus === "error" || errorMessage) && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold">×</span>
          <p className="text-sm font-bold text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* コンテンツ情報 */}
          <SectionCard icon={<Building className="w-5 h-5 text-gray-400" />} title="コンテンツ情報">
            <div className="p-8 space-y-6">
              <StudioFormField
                label="キャッチコピー"
                name="tagline"
                value={company.tagline || ""}
                onChange={handleChange}
                placeholder="求職者の心を掴むキャッチコピーを入力"
                error={taglineError || undefined}
              />
              {company.tagline !== undefined && company.tagline !== null && (
                <p
                  className={`text-[10px] text-right -mt-4 ${
                    taglineError ? "text-red-500 font-bold" : "text-gray-400"
                  }`}
                >
                  {company.tagline.length}/32文字
                </p>
              )}
              <StudioFormField
                label="会社紹介文"
                name="description"
                type="textarea"
                value={company.description}
                onChange={handleChange}
                rows={12}
                placeholder="会社紹介文を入力(3000字以内)"
                helperText={`${company.description.length} / 3000 文字`}
              />
            </div>
          </SectionCard>

          {/* 動画管理 */}
          <SectionCard icon={<Video className="w-5 h-5 text-gray-400" />} title="動画管理">
            <div className="p-8 space-y-8">
              <StudioVideoList
                label="メインビデオ"
                videos={company.mainVideo ? [{ id: "main", title: "メインビデオ", video: company.mainVideo }] : []}
                onChange={(videos) => {
                  setCompany((prev) => ({ ...prev, mainVideo: videos[0]?.video || undefined }));
                }}
                onError={handleVideoError}
                maxSelection={1}
              />
              <p className="text-[10px] text-gray-400 -mt-4">
                企業ページ上部に表示されるメイン動画です。MP4, WebM形式 (最大50MB)。
              </p>
              <div className="pt-4 border-t border-gray-100">
                <StudioVideoList
                  label="ショート動画"
                  videos={company.shortVideos}
                  onChange={(videos) => setCompany((prev) => ({ ...prev, shortVideos: videos }))}
                  onError={handleVideoError}
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <StudioVideoList
                  label="動画"
                  videos={company.documentaryVideos || []}
                  onChange={(videos) => setCompany((prev) => ({ ...prev, documentaryVideos: videos }))}
                  onError={handleVideoError}
                />
              </div>
            </div>
          </SectionCard>

          {/* 福利厚生・制度 */}
          <StudioBenefitsSection
            company={company}
            setCompany={setCompany}
            setErrorMessage={setErrorMessage}
            setSaveStatus={setSaveStatus}
          />
        </div>

        <div className="space-y-8">
          {/* 企業ページURL */}
          {companyId && (
            <SectionCard icon={<Globe className="w-5 h-5 text-gray-400" />} title="企業ページURL">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/company/${companyId}`}
                    readOnly
                    className="flex-1 text-sm font-mono text-gray-700 bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                    aria-label="URLをコピー"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">このURLをコピーして、求職者に共有できます</p>
              </div>
            </SectionCard>
          )}

          {/* 外部リンク */}
          <SectionCard icon={<Globe className="w-5 h-5 text-gray-400" />} title="外部リンク">
            <div className="p-6 space-y-4">
              <StudioSnsFields accountNames={snsAccountNames} onChange={handleSnsChange} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
