"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import SubmitReviewModal from "@/components/studio/organisms/SubmitReviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioBackButton from "@/components/studio/atoms/StudioBackButton";
import {
  getJobDraft,
  createJobDraft,
  updateJobDraft,
  uploadJobDraftCoverImage,
  submitJobForReview,
  toggleJobStatus
} from "@/lib/actions/job-actions";
import { hasFieldChanges } from "@/utils/form-utils";
import { validateRequired, validateMaxLength } from "@jobtv-app/shared/utils/validation";
import type { Tables } from "@jobtv-app/shared/types";
import { TITLE_MAX_LENGTH, LONG_DESCRIPTION_MAX_LENGTH } from "@/constants/validation";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";
import { useStudioEditor } from "@/hooks/useStudioEditor";
import StudioEditorStatusSection from "@/components/studio/molecules/StudioEditorStatusSection";
import StudioEditorAlerts from "@/components/studio/molecules/StudioEditorAlerts";

// 型定義（DBスキーマに合わせる）
type JobDraft = Tables<"job_postings_draft">;
type JobPosting = Tables<"job_postings">;

interface Job extends Omit<JobDraft, "available_statuses" | "draft_status" | "production_job_id"> {
  available_statuses?: JobDraft["available_statuses"];
  production_job_id?: string | null;
  production_status?: "active" | "closed" | null; // 本番テーブルのstatus
  cover_image_url: string | null;
  status?: "draft" | "active" | "closed"; // 表示用のstatus（draft_statusから変換）
  draft_status?: "draft" | "submitted" | "approved" | "rejected"; // ドラフトステータス
  companies?: {
    name: string;
    logo_url: string | null;
  };
}

export default function JobEditPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const isNew = jobId === "new";

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [initialJob, setInitialJob] = useState<Job | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);

  // 共通スタジオエディターフック
  const {
    loading,
    setLoading,
    saving,
    setSaving,
    error,
    setError,
    fieldErrors,
    setFieldErrors,
    isSubmittingReview,
    isPreviewOpen,
    setIsPreviewOpen,
    previewDevice,
    setPreviewDevice,
    isReadOnly,
    showUnderReviewAlert,
    showOlderVersionAlert,
    handleToggleStatus,
    submitForReview,
    isSubmitModalOpen,
    setIsSubmitModalOpen
  } = useStudioEditor({
    type: "job",
    id: jobId,
    data: selectedJob
      ? {
          id: selectedJob.id,
          draft_status: selectedJob.draft_status as string | undefined,
          production_status: (selectedJob.production_status || undefined) as string | undefined,
          production_id: selectedJob.production_job_id
        }
      : null,
    onSave: async () => {
      if (!selectedJob) {
        return { error: "求人データが見つかりません" };
      }

      const jobData = {
        title: selectedJob.title || "",
        employment_type: selectedJob.employment_type || "",
        graduation_year: selectedJob.graduation_year || undefined,
        prefecture: selectedJob.prefecture || "",
        location_detail: selectedJob.location_detail || "",
        description: selectedJob.description || "",
        requirements: selectedJob.requirements || "",
        benefits: selectedJob.benefits || "",
        selection_process: selectedJob.selection_process || "",
        available_statuses: selectedJob.available_statuses || [],
        cover_image_url: selectedJob.cover_image_url || null
      };

      let draftId = selectedJob.id;

      // 新規作成または既存のdraftを更新
      if (isNew || !draftId) {
        const createResult = await createJobDraft(jobData);
        if (createResult.error) {
          return { error: createResult.error };
        }
        draftId = createResult.data?.id || "";
        // 新規作成した場合はselectedJobを更新
        if (createResult.data) {
          setSelectedJob({ ...selectedJob, id: draftId });
        }
      } else {
        const updateResult = await updateJobDraft(draftId, jobData);
        if (updateResult.error) {
          return { error: updateResult.error };
        }
      }

      return { error: null, draftId };
    },
    onSubmit: async (id, keepProductionActive) => {
      return await submitJobForReview(id, keepProductionActive);
    },
    onToggleStatus: async (id, status) => {
      return await toggleJobStatus(selectedJob?.production_job_id || "", status);
    },
    validate: () => {
      if (!validateRequiredFields()) {
        return "必須項目を入力してください";
      }
      if (Object.keys(fieldErrors).length > 0 || hasCharacterLimitErrors()) {
        return "入力内容を確認してください";
      }
      return null;
    },
    redirectTo: "/studio/jobs"
  });

  // 変更検知関数
  const hasJobChanges = useCallback((): boolean => {
    if (!selectedJob || !initialJob) return false;

    // 主要なフィールドを比較
    const fieldsToCompare: (keyof Job)[] = [
      "title",
      "employment_type",
      "graduation_year",
      "prefecture",
      "location_detail",
      "description",
      "requirements",
      "benefits",
      "selection_process",
      "cover_image_url"
    ];

    // フィールドの変更をチェック
    const fieldChanged = hasFieldChanges(selectedJob, initialJob, fieldsToCompare);

    return fieldChanged;
  }, [selectedJob, initialJob]);

  // 求人データを取得
  useEffect(() => {
    const loadJob = async () => {
      if (isNew) {
        // 新規作成の場合
        const defaultStatuses: JobPosting["available_statuses"] = [
          "applied",
          "document_screening",
          "first_interview",
          "second_interview",
          "final_interview",
          "offer",
          "rejected",
          "withdrawn"
        ];
        const newJob: Job = {
          id: "",
          company_id: "",
          title: "",
          employment_type: "正社員",
          prefecture: "",
          location_detail: "",
          status: "active",
          draft_status: undefined,
          description: "",
          requirements: "",
          benefits: "",
          selection_process: "",
          graduation_year: 2028,
          available_statuses: defaultStatuses,
          cover_image_url: "",
          display_order: 0,
          created_by: "",
          created_at: "",
          updated_at: "",
          submitted_at: null,
          approved_at: null,
          rejected_at: null
        };
        setSelectedJob(newJob);
        setInitialJob(JSON.parse(JSON.stringify(newJob)));
        setLoading(false);
      } else {
        // 既存の求人draftを取得
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await getJobDraft(jobId);
        if (fetchError) {
          setError(fetchError);
          setLoading(false);
          return;
        }

        if (data) {
          const jobData = {
            ...data,
            production_job_id: data.production_job_id || undefined,
            production_status: (data as any).production_status || undefined
          } as Job;
          setSelectedJob(jobData);
          setInitialJob(JSON.parse(JSON.stringify(jobData)));
        }
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId, isNew, setLoading, setError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    if (selectedJob) {
      if (name === "graduation_year") {
        setSelectedJob({ ...selectedJob, [name]: parseInt(value, 10) });
      } else {
        setSelectedJob({ ...selectedJob, [name]: value });
      }

      // 必須項目と文字数制限のチェック
      const newErrors: Partial<typeof fieldErrors> = {};

      // 必須項目のチェック
      if (name === "employment_type") {
        const error = validateRequired(value, "雇用形態");
        if (error) newErrors.employment_type = error;
      }
      if (name === "graduation_year") {
        const error = validateRequired(value, "卒業年");
        if (error) newErrors.graduation_year = error;
      }
      if (name === "prefecture") {
        const error = validateRequired(value, "勤務地/都道府県");
        if (error) newErrors.prefecture = error;
      }
      if (name === "location_detail") {
        const error =
          validateRequired(value, "勤務地/詳細") || validateMaxLength(value, TITLE_MAX_LENGTH, "勤務地/詳細");
        if (error) newErrors.location_detail = error;
      }
      if (name === "description") {
        const error = validateRequired(value, "職務内容");
        if (error) newErrors.description = error;
      }

      // 文字数制限のチェック
      if (name === "title") {
        const error = validateMaxLength(value, TITLE_MAX_LENGTH, "求人タイトル");
        if (error) newErrors.title = error;
      }
      if (name === "description") {
        const error = validateMaxLength(value, LONG_DESCRIPTION_MAX_LENGTH, "職務内容");
        if (error) newErrors.description = error;
      }
      if (name === "requirements") {
        const error = validateMaxLength(value, LONG_DESCRIPTION_MAX_LENGTH, "応募資格");
        if (error) newErrors.requirements = error;
      }
      if (name === "benefits") {
        const error = validateMaxLength(value, LONG_DESCRIPTION_MAX_LENGTH, "おすすめポイント");
        if (error) newErrors.benefits = error;
      }
      if (name === "selection_process") {
        const error = validateMaxLength(value, LONG_DESCRIPTION_MAX_LENGTH, "選考フロー");
        if (error) newErrors.selection_process = error;
      }

      // フィールドエラーを更新
      setFieldErrors((prev) => {
        const updated: Record<string, string> = { ...prev };
        if (newErrors[name as keyof typeof newErrors]) {
          updated[name as keyof typeof updated] = newErrors[name as keyof typeof newErrors] as string;
        } else if (updated[name as keyof typeof updated]) {
          // エラーが解消された場合は削除
          delete updated[name as keyof typeof updated];
        }
        return updated;
      });
    }
  };

  // 文字数制限のチェック
  const hasCharacterLimitErrors = (): boolean => {
    if (!selectedJob) return false;

    if (selectedJob.title && validateMaxLength(selectedJob.title, TITLE_MAX_LENGTH)) {
      return true;
    }
    if (selectedJob.description && validateMaxLength(selectedJob.description, LONG_DESCRIPTION_MAX_LENGTH)) {
      return true;
    }
    if (selectedJob.requirements && validateMaxLength(selectedJob.requirements, LONG_DESCRIPTION_MAX_LENGTH)) {
      return true;
    }
    if (selectedJob.benefits && validateMaxLength(selectedJob.benefits, LONG_DESCRIPTION_MAX_LENGTH)) {
      return true;
    }
    if (
      selectedJob.selection_process &&
      validateMaxLength(selectedJob.selection_process, LONG_DESCRIPTION_MAX_LENGTH)
    ) {
      return true;
    }

    return false;
  };

  // 必須項目のバリデーション
  const validateRequiredFields = (): boolean => {
    if (!selectedJob) return false;

    const errors: {
      employment_type?: string;
      graduation_year?: string;
      prefecture?: string;
      location_detail?: string;
      description?: string;
      title?: string;
      requirements?: string;
      benefits?: string;
      selection_process?: string;
    } = {};

    const employmentTypeError = validateRequired(selectedJob.employment_type, "雇用形態");
    if (employmentTypeError) errors.employment_type = employmentTypeError;

    const graduationYearError = validateRequired(selectedJob.graduation_year?.toString(), "卒業年");
    if (graduationYearError) errors.graduation_year = graduationYearError;

    const prefectureError = validateRequired(selectedJob.prefecture, "勤務地/都道府県");
    if (prefectureError) errors.prefecture = prefectureError;

    const locationDetailError =
      validateRequired(selectedJob.location_detail, "勤務地/詳細") ||
      validateMaxLength(selectedJob.location_detail || "", TITLE_MAX_LENGTH, "勤務地/詳細");
    if (locationDetailError) errors.location_detail = locationDetailError;

    const descriptionError = validateRequired(selectedJob.description, "職務内容");
    if (descriptionError) errors.description = descriptionError;

    // 文字数制限のチェック
    if (selectedJob.title) {
      const titleError = validateMaxLength(selectedJob.title, TITLE_MAX_LENGTH, "求人タイトル");
      if (titleError) errors.title = titleError;
    }

    if (selectedJob.description) {
      const descriptionMaxError = validateMaxLength(selectedJob.description, LONG_DESCRIPTION_MAX_LENGTH, "職務内容");
      if (descriptionMaxError) errors.description = descriptionMaxError;
    }

    if (selectedJob.requirements) {
      const requirementsError = validateMaxLength(selectedJob.requirements, LONG_DESCRIPTION_MAX_LENGTH, "応募資格");
      if (requirementsError) errors.requirements = requirementsError;
    }

    if (selectedJob.benefits) {
      const benefitsError = validateMaxLength(selectedJob.benefits, LONG_DESCRIPTION_MAX_LENGTH, "おすすめポイント");
      if (benefitsError) errors.benefits = benefitsError;
    }

    if (selectedJob.selection_process) {
      const selectionProcessError = validateMaxLength(
        selectedJob.selection_process,
        LONG_DESCRIPTION_MAX_LENGTH,
        "選考フロー"
      );
      if (selectionProcessError) errors.selection_process = selectionProcessError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 卒年度は2028年のみ
  const graduationYears = [2028];

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedJob) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 font-medium">求人が見つかりません</p>
      </div>
    );
  }

  // プレビュー用のデータをフロントと同じ形式に変換
  const locationText = [selectedJob.prefecture, selectedJob.location_detail]
    .filter(Boolean)
    .join(selectedJob.prefecture && selectedJob.location_detail ? " " : "");

  const previewData: {
    id: string;
    title: string;
    graduationYear?: string;
    location: string;
    status: "published" | "private";
    description: string;
    workLocation?: string;
    workConditions?: string;
    requirements: string;
    benefits: string;
    selectionProcess: string;
    companyName: string;
    companyLogo: string;
    coverImage?: string;
  } = {
    id: selectedJob.id || "",
    title: selectedJob.title,
    graduationYear: `${selectedJob.graduation_year}年卒`,
    location: locationText || "",
    status: (selectedJob.production_status || selectedJob.status) === "active" ? "published" : "private",
    description: selectedJob.description || "",
    requirements: selectedJob.requirements || "",
    benefits: selectedJob.benefits || "",
    selectionProcess: selectedJob.selection_process || "",
    companyName: selectedJob.companies?.name || "サンプル株式会社",
    companyLogo:
      selectedJob.companies?.logo_url ||
      "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
    workLocation: locationText || undefined,
    workConditions: selectedJob.employment_type || undefined,
    coverImage: selectedJob.cover_image_url || undefined
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      {/* 共通警告メッセージ */}
      <StudioEditorAlerts showUnderReviewAlert={showUnderReviewAlert} showOlderVersionAlert={showOlderVersionAlert} />

      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={previewData}
        previewUrl="/studio/jobs/preview-content"
      />

      <SubmitReviewModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={(keepProductionActive) => {
          submitForReview(keepProductionActive);
        }}
        isSubmitting={isSubmittingReview}
        hasProduction={!!selectedJob.production_job_id}
      />

      <ErrorMessage message={error || ""} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudioBackButton href="/studio/jobs" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {isNew ? "新規求人作成" : "求人を編集"}
            </h1>
            <p className="text-gray-500 font-medium">求人の詳細情報を入力してください。</p>
          </div>
        </div>
        {/* 審査ステータスと公開設定トグル（ヘッダー右側） */}
        {!isNew && (
          <StudioEditorStatusSection
            draftStatus={selectedJob.draft_status}
            productionStatus={selectedJob.production_status || (selectedJob.status as any)}
            onToggleStatus={handleToggleStatus}
            hasProduction={!!selectedJob.production_job_id}
            disabled={saving}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg text-gray-900">基本情報</h2>
            </div>
            <div className="p-8 space-y-6">
              <StudioFormField
                label="求人タイトル"
                name="title"
                value={selectedJob.title}
                onChange={handleChange}
                placeholder="例：機械学習エンジニア"
                required
                maxLength={TITLE_MAX_LENGTH}
                showCharCount
                error={fieldErrors.title}
                disabled={isReadOnly}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <StudioLabel required>雇用形態</StudioLabel>
                  <StudioSelect
                    name="employment_type"
                    value={selectedJob.employment_type || ""}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">選択してください</option>
                    <option value="正社員">正社員</option>
                    <option value="契約社員">契約社員</option>
                    <option value="業務委託">業務委託</option>
                    <option value="インターン">インターン</option>
                  </StudioSelect>
                  {fieldErrors.employment_type && (
                    <p className="text-xs text-red-500 font-bold">{fieldErrors.employment_type}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <StudioLabel required>卒業年</StudioLabel>
                  <StudioSelect
                    name="graduation_year"
                    value={selectedJob.graduation_year.toString()}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                  >
                    {graduationYears.map((year) => (
                      <option key={year} value={year}>
                        {year}年卒
                      </option>
                    ))}
                  </StudioSelect>
                  {fieldErrors.graduation_year && (
                    <p className="text-xs text-red-500 font-bold">{fieldErrors.graduation_year}</p>
                  )}
                </div>
                <PrefectureSelect
                  label="勤務地/都道府県"
                  value={selectedJob.prefecture || ""}
                  onChange={handleChange}
                  required
                  error={fieldErrors.prefecture}
                  disabled={isReadOnly}
                />
                <div className="space-y-2">
                  <StudioFormField
                    label="勤務地/詳細"
                    name="location_detail"
                    value={selectedJob.location_detail || ""}
                    onChange={handleChange}
                    placeholder="例：港区、リモート可など"
                    required
                    maxLength={TITLE_MAX_LENGTH}
                    showCharCount
                    error={fieldErrors.location_detail}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <StudioFormField
                label="職務内容"
                name="description"
                type="textarea"
                value={selectedJob.description || ""}
                onChange={handleChange}
                rows={6}
                maxLength={LONG_DESCRIPTION_MAX_LENGTH}
                showCharCount
                required
                error={fieldErrors.description}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* 詳細内容 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">詳細内容</h2>
            </div>
            <div className="p-8 space-y-6">
              <StudioFormField
                label="応募資格"
                name="requirements"
                type="textarea"
                value={selectedJob.requirements || ""}
                onChange={handleChange}
                rows={4}
                maxLength={LONG_DESCRIPTION_MAX_LENGTH}
                showCharCount
                error={fieldErrors.requirements}
                disabled={isReadOnly}
              />
              <StudioFormField
                label="おすすめポイント"
                name="benefits"
                type="textarea"
                value={selectedJob.benefits || ""}
                onChange={handleChange}
                rows={4}
                maxLength={LONG_DESCRIPTION_MAX_LENGTH}
                showCharCount
                error={fieldErrors.benefits}
                disabled={isReadOnly}
              />
              <StudioFormField
                label="選考フロー"
                name="selection_process"
                type="textarea"
                value={selectedJob.selection_process || ""}
                onChange={handleChange}
                rows={4}
                maxLength={LONG_DESCRIPTION_MAX_LENGTH}
                showCharCount
                error={fieldErrors.selection_process}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* カバー画像 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-gray-900">カバー画像</h2>
                <StudioBadge variant="neutral">任意</StudioBadge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                求人詳細ページの上部に表示される画像を設定できます。設定しなかった場合は、企業のカバー画像が自動で使用されます。
              </p>
            </div>
            <div className={`p-6 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
              <StudioImageUpload
                label=""
                type="cover"
                currentUrl={selectedJob.cover_image_url || undefined}
                onUploadComplete={(url) => {
                  if (selectedJob) {
                    setSelectedJob({ ...selectedJob, cover_image_url: url || "" });
                  }
                }}
                onUploadingChange={setIsCoverImageUploading}
                onError={(error) => {
                  setError(error);
                }}
                aspectRatio="wide"
                helperText="1200x400px 以上を推奨"
                customUploadFunction={async (file: File) => {
                  return await uploadJobDraftCoverImage(file, selectedJob.id || undefined);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 画面下部のボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        showPreviewButton={true}
        onSubmitForReview={() => setIsSubmitModalOpen(true)}
        isSubmitting={isSubmittingReview}
        isSubmitDisabled={isCoverImageUploading || Object.keys(fieldErrors).length > 0 || hasCharacterLimitErrors()}
        showSubmitButton={!isReadOnly}
        hasChanges={hasJobChanges()}
        showActualPageButton={!!selectedJob.production_job_id && selectedJob.production_status === "active"}
        onViewActualPage={() => {
          if (selectedJob.production_job_id) {
            window.open(`/job/${selectedJob.production_job_id}`, "_blank");
          }
        }}
      />
    </div>
  );
}
