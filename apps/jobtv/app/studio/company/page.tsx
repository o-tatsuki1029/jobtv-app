"use client";

import React, { useState, useEffect } from "react";
import { Building, Image as ImageIcon, Globe, Loader2, CheckCircle2, Video, Copy, Check } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioVideoList from "@/components/studio/molecules/StudioVideoList";
import StudioSnsFields from "@/components/studio/molecules/StudioSnsFields";
import StudioBenefitsSection from "@/components/studio/molecules/StudioBenefitsSection";
import SectionCard from "@/components/studio/molecules/SectionCard";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useDraftSubmit } from "@/hooks/useDraftSubmit";
import { uploadCompanyPageDraftCoverImage, submitCompanyPageForReview } from "@/lib/actions/company-page-actions";
import { getCompanyProfileWithPage } from "@/lib/actions/company-profile-actions";
import { dbToCompanyData } from "@/components/company";
import { extractSnsAccountNames } from "@/utils/sns-url-utils";
import { validateMaxLength } from "@jobtv-app/shared/utils/validation";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";

export default function CompanyPageManagement() {
  const {
    company,
    companyId,
    draftId,
    draftStatus,
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
    hasChanges: hasChangesFromHook
  } = useCompanyProfile();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isCopied, setIsCopied] = useState(false);
  const [taglineError, setTaglineError] = useState<string | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    coverImage?: string;
  }>({});

  // ページ離脱時の警告
  useUnsavedChanges(hasChangesFromHook);

  // 審査申請の共通ロジック
  const {
    submitForReview,
    isSubmitting,
    error: submitError
  } = useDraftSubmit({
    onSave: async () => {
      await handleSave();
      return { error: null };
    },
    onSubmit: async (draftId) => {
      return await submitCompanyPageForReview(draftId);
    },
    validate: () => {
      if (taglineError) {
        return "入力内容を確認してください";
      }
      return null;
    },
    onSuccess: async () => {
      // データを再取得して更新
      const refreshResult = await getCompanyProfileWithPage();
      if (refreshResult.data) {
        const updatedCompanyData = dbToCompanyData(refreshResult.data);
        const snsNames = extractSnsAccountNames(updatedCompanyData.snsUrls);
        setCompany(updatedCompanyData);
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  });

  // 審査申請ハンドラー
  const handleSubmitForReview = async () => {
    await submitForReview(draftId);
  };

  // submitErrorも表示する
  useEffect(() => {
    if (submitError) {
      setErrorMessage(submitError);
      setSaveStatus("error");
    }
  }, [submitError, setErrorMessage, setSaveStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // キャッチコピーのバリデーション（32字以内）
    if (name === "tagline") {
      const error = validateMaxLength(value, 32, "キャッチコピー");
      setTaglineError(error);
    }

    setCompany((prev) => ({ ...prev, [name]: value }));

    // フィールドエラーをクリア
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 画像アップロードハンドラー（カバー画像のみ）
  const handleImageUpload = (url: string) => {
    setCompany((prev) => ({ ...prev, coverImage: url }));
    if (fieldErrors.coverImage) {
      setFieldErrors((prev) => ({ ...prev, coverImage: undefined }));
    }
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
    <div className="space-y-10 pb-24">
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
        {/* 公開ステータス表示 */}
        {company.status && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">公開ステータス:</span>
            <StudioBadge
              variant={company.status === "active" ? "success" : company.status === "pending" ? "neutral" : "neutral"}
            >
              {company.status === "active" ? "公開中" : company.status === "pending" ? "審査中" : "非公開"}
            </StudioBadge>
          </div>
        )}
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
                maxLength={3000}
                showCharCount
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

          {/* カバー画像 */}
          <SectionCard icon={<ImageIcon className="w-5 h-5 text-gray-400" />} title="カバー画像">
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <StudioImageUpload
                  label=""
                  type="cover"
                  currentUrl={company.coverImage}
                  onUploadComplete={handleImageUpload}
                  onUploadingChange={setIsCoverImageUploading}
                  onError={(error) => {
                    setErrorMessage(error);
                    setSaveStatus("error");
                  }}
                  aspectRatio="wide"
                  helperText="1200x400px 以上を推奨"
                  customUploadFunction={async (file: File) => {
                    const result = await uploadCompanyPageDraftCoverImage(file);
                    return result;
                  }}
                />
                {fieldErrors.coverImage && <p className="text-xs text-red-500 font-bold">{fieldErrors.coverImage}</p>}
              </div>
            </div>
          </SectionCard>

          {/* 外部リンク */}
          <SectionCard icon={<Globe className="w-5 h-5 text-gray-400" />} title="外部リンク">
            <div className="p-6 space-y-4">
              <StudioSnsFields accountNames={snsAccountNames} onChange={handleSnsChange} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 画面下部のボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        onSubmitForReview={handleSubmitForReview}
        isSubmitting={isSubmitting}
        isSubmitDisabled={isSaving || isCoverImageUploading || !!taglineError}
        showSubmitButton={!!(draftId && draftStatus !== "submitted" && draftStatus !== "approved")}
        publicPageUrl={companyId ? `/company/${companyId}` : undefined}
        hasChanges={hasChangesFromHook()}
      />
    </div>
  );
}
