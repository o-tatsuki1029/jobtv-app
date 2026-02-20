"use client";

import React, { useState } from "react";
import { Building, Image as ImageIcon, Globe, Loader2 } from "lucide-react";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import SubmitReviewModal from "@/components/studio/organisms/SubmitReviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioSnsFields from "@/components/studio/molecules/StudioSnsFields";
import StudioBenefitsSection from "@/components/studio/molecules/StudioBenefitsSection";
import SectionCard from "@/components/studio/molecules/SectionCard";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import {
  uploadCompanyPageDraftCoverImage,
  submitCompanyPageForReview,
  toggleCompanyPageStatus
} from "@/lib/actions/company-page-actions";
import { validateRequired, validateMaxLength } from "@jobtv-app/shared/utils/validation";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";
import { useStudioEditor } from "@/hooks/useStudioEditor";
import StudioEditorStatusSection from "@/components/studio/molecules/StudioEditorStatusSection";
import StudioEditorAlerts from "@/components/studio/molecules/StudioEditorAlerts";

export default function CompanyPageManagement() {
  const {
    company,
    companyId,
    draftId,
    draftStatus,
    productionPageId,
    productionStatus,
    isLoading,
    isSaving,
    errorMessage,
    snsAccountNames,
    setCompany,
    setSnsAccountNames,
    handleSave,
    hasChanges: hasChangesFromHook
  } = useCompanyProfile();

  const [taglineError, setTaglineError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);

  // 共通スタジオエディターフックの使用
  const {
    isReadOnly,
    showUnderReviewAlert,
    showOlderVersionAlert,
    handleToggleStatus,
    submitForReview,
    isSubmittingReview,
    isPreviewOpen,
    setIsPreviewOpen,
    previewDevice,
    setPreviewDevice,
    error: studioError,
    setError: setStudioError,
    isSubmitModalOpen,
    setIsSubmitModalOpen
  } = useStudioEditor({
    type: "company_page",
    id: companyId || "new",
    data: companyId
      ? {
          id: companyId,
          draft_status: draftStatus || undefined,
          production_status: productionStatus || undefined,
          production_id: productionPageId
        }
      : null,
    onSave: async () => {
      await handleSave();
      // handleSave内でdraftIdも更新されるため、useCompanyProfileから取得
      return { error: null, draftId: draftId };
    },
    onSubmit: async (id: string, keepProductionActive?: boolean) => {
      return await submitCompanyPageForReview(id, keepProductionActive);
    },
    onToggleStatus: async (id, status) => {
      return await toggleCompanyPageStatus(id, status);
    },
    validate: () => {
      if (taglineError || descriptionError) {
        return "入力内容を確認してください";
      }
      // 必須項目のチェック
      if (!company.tagline || company.tagline.trim() === "") {
        return "キャッチコピーは必須項目です";
      }
      if (!company.description || company.description.trim() === "") {
        return "会社紹介文は必須項目です";
      }
      return null;
    }
  });

  // エラーメッセージの統合（useCompanyProfileのerrorMessageとuseStudioEditorのerrorを統合）
  const displayError = errorMessage || studioError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;

    // キャッチコピーのバリデーション（必須、32字以内）
    if (name === "tagline") {
      const requiredError = validateRequired(value, "キャッチコピー");
      const maxLengthError = validateMaxLength(value, 32, "キャッチコピー");
      setTaglineError(requiredError || maxLengthError || null);
    }

    // 会社紹介文のバリデーション（必須、3000字以内）
    if (name === "description") {
      const requiredError = validateRequired(value, "会社紹介文");
      const maxLengthError = validateMaxLength(value, 3000, "会社紹介文");
      setDescriptionError(requiredError || maxLengthError || null);
    }

    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  // 画像アップロードハンドラー（カバー画像のみ）
  const handleImageUpload = (url: string) => {
    setCompany((prev) => ({ ...prev, coverImage: url }));
  };

  const handleSnsChange = (platform: "x" | "instagram" | "tiktok" | "youtube", value: string) => {
    setSnsAccountNames((prev) => ({ ...prev, [platform]: value }));
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
      {/* 共通警告メッセージ */}
      <StudioEditorAlerts showUnderReviewAlert={showUnderReviewAlert} showOlderVersionAlert={showOlderVersionAlert} />

      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={company}
      />

      {/* 審査申請確認モーダル */}
      <SubmitReviewModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={(keepProductionActive) => {
          submitForReview(keepProductionActive);
        }}
        isSubmitting={isSubmittingReview}
        hasProduction={!!productionPageId}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">企業ページ管理</h1>
          <p className="text-gray-500 font-medium">求職者に表示される企業プロフィールの編集と公開設定を行います。</p>
        </div>
        {/* 審査ステータスと公開設定トグル（ヘッダー右側） */}
        <StudioEditorStatusSection
          draftStatus={draftStatus}
          productionStatus={productionStatus || undefined}
          onToggleStatus={handleToggleStatus}
          hasProduction={!!productionPageId}
          disabled={isSaving}
        />
      </div>

      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold">×</span>
          <p className="text-sm font-bold text-red-800">{displayError}</p>
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
                required
                maxLength={32}
                showCharCount
                error={taglineError || undefined}
                disabled={isReadOnly}
              />
              <StudioFormField
                label="会社紹介文"
                name="description"
                type="textarea"
                value={company.description}
                onChange={handleChange}
                rows={12}
                placeholder="会社紹介文を入力"
                required
                maxLength={3000}
                showCharCount
                error={descriptionError || undefined}
                disabled={isReadOnly}
              />
            </div>
          </SectionCard>

          {/* 福利厚生・制度 */}
          <div className={isReadOnly ? "opacity-60 pointer-events-none" : ""}>
            <StudioBenefitsSection
              company={company}
              setCompany={setCompany}
              setErrorMessage={setStudioError}
              setSaveStatus={() => {}}
            />
          </div>
        </div>

        <div className="space-y-8">
          {/* カバー画像 */}
          <SectionCard icon={<ImageIcon className="w-5 h-5 text-gray-400" />} title="カバー画像">
            <div className={`p-8 space-y-8 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="space-y-2">
                <StudioImageUpload
                  label=""
                  type="cover"
                  currentUrl={company.coverImage}
                  onUploadComplete={handleImageUpload}
                  onUploadingChange={setIsCoverImageUploading}
                  onError={(error) => {
                    setStudioError(error);
                  }}
                  aspectRatio="wide"
                  helperText="1200x400px 以上を推奨"
                  customUploadFunction={async (file: File) => {
                    const result = await uploadCompanyPageDraftCoverImage(file);
                    return result;
                  }}
                />
              </div>
            </div>
          </SectionCard>

          {/* 外部リンク */}
          <SectionCard icon={<Globe className="w-5 h-5 text-gray-400" />} title="外部リンク">
            <div className={`p-6 space-y-4 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
              <StudioSnsFields accountNames={snsAccountNames} onChange={handleSnsChange} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 画面下部のボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        showPreviewButton={true}
        onSubmitForReview={() => setIsSubmitModalOpen(true)}
        isSubmitting={isSubmittingReview}
        isSubmitDisabled={isSaving || isCoverImageUploading || !!taglineError || !!descriptionError}
        showSubmitButton={!isReadOnly}
        hasChanges={hasChangesFromHook()}
        showActualPageButton={!!productionPageId && company.status === "active"}
        onViewActualPage={() => {
          if (companyId) {
            window.open(`/company/${companyId}`, "_blank");
          }
        }}
      />
    </div>
  );
}
