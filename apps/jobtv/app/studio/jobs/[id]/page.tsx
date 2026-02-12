"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Briefcase, ArrowLeft } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import { getJobDraft, createJobDraft, updateJobDraft, uploadJobDraftCoverImage, submitJobForReview } from "@/lib/actions/job-actions";
import { useFormState } from "@/hooks/useFormState";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useDraftSubmit } from "@/hooks/useDraftSubmit";
import { hasFieldChanges, hasObjectChanges, hasChanges } from "@/utils/form-utils";
import { validateRequired, validateMaxLength } from "@jobtv-app/shared/utils/validation";
import type { Tables } from "@jobtv-app/shared/types";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";

// 型定義（DBスキーマに合わせる）
type JobDraft = Tables<"job_postings_draft">;

interface Job extends Omit<JobDraft, "available_statuses" | "draft_status"> {
  available_statuses?: JobDraft["available_statuses"];
  draft_status?: JobDraft["draft_status"];
  production_job_id?: string | null;
  cover_image_url: string | null;
}

// 必須の応募ステータス
const REQUIRED_STATUSES: string[] = ["applied", "offer", "rejected", "withdrawn"];

// 都道府県リスト
const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];

export default function JobEditPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const isNew = jobId === "new";

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [initialJob, setInitialJob] = useState<Job | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    employment_type?: string;
    graduation_year?: string;
    prefecture?: string;
    location_detail?: string;
    description?: string;
    title?: string;
    requirements?: string;
    benefits?: string;
    selection_process?: string;
  }>({});

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

    // 応募ステータスの変更をチェック
    const statusChanged = hasObjectChanges(
      { available_statuses: selectedJob.available_statuses || [] },
      { available_statuses: initialJob.available_statuses || [] }
    );

    return hasChanges(fieldChanged, statusChanged);
  }, [selectedJob, initialJob]);

  // ページ離脱時の警告
  const { handleNavigation } = useUnsavedChanges(hasJobChanges);

  // 求人データを取得
  useEffect(() => {
    const loadJob = async () => {
      if (isNew) {
        // 新規作成の場合
        const currentYear = new Date().getFullYear();
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
          location: "",
          prefecture: "",
          location_detail: "",
          status: "pending",
          description: "",
          requirements: "",
          benefits: "",
          selection_process: "",
          graduation_year: currentYear,
          available_statuses: defaultStatuses,
          cover_image_url: "",
          created_by: "",
          created_at: "",
          updated_at: ""
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
          // 必須ステータスを常に含める
          const currentStatuses = data.available_statuses || [];
          const finalStatuses = [...new Set([...REQUIRED_STATUSES, ...currentStatuses])];

          const jobData = {
            ...data,
            available_statuses: finalStatuses as JobPosting["available_statuses"]
          } as Job;
          setSelectedJob(jobData);
          setInitialJob(JSON.parse(JSON.stringify(jobData)));
        }
        setLoading(false);
      }
    };

    loadJob();
  }, [jobId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        const error = validateRequired(value, "勤務地/詳細");
        if (error) newErrors.location_detail = error;
      }
      if (name === "description") {
        const error = validateRequired(value, "職務内容");
        if (error) newErrors.description = error;
      }
      
      // 文字数制限のチェック
      if (name === "title") {
        const error = validateMaxLength(value, 30, "求人タイトル");
        if (error) newErrors.title = error;
      }
      if (name === "description") {
        const error = validateMaxLength(value, 2000, "職務内容");
        if (error) newErrors.description = error;
      }
      if (name === "requirements") {
        const error = validateMaxLength(value, 2000, "応募資格");
        if (error) newErrors.requirements = error;
      }
      if (name === "benefits") {
        const error = validateMaxLength(value, 2000, "福利厚生・制度");
        if (error) newErrors.benefits = error;
      }
      if (name === "selection_process") {
        const error = validateMaxLength(value, 2000, "選考フロー");
        if (error) newErrors.selection_process = error;
      }
      
      // フィールドエラーを更新
      setFieldErrors((prev) => {
        const updated = { ...prev };
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

  // 応募ステータスの選択を処理
  const handleStatusChange = (status: string, checked: boolean) => {
    if (!selectedJob) return;

    // 必須ステータスは変更不可
    if (REQUIRED_STATUSES.includes(status)) {
      return;
    }

    const currentStatuses = selectedJob.available_statuses || [];
    let newStatuses: string[];

    if (checked) {
      newStatuses = [...currentStatuses, status];
    } else {
      newStatuses = currentStatuses.filter((s) => s !== status);
    }

    // 必須ステータスを常に含める
    const finalStatuses = [...new Set([...REQUIRED_STATUSES, ...newStatuses])];

    setSelectedJob({
      ...selectedJob,
      available_statuses: finalStatuses as JobPosting["available_statuses"]
    });
  };

  // 文字数制限のチェック
  const hasCharacterLimitErrors = (): boolean => {
    if (!selectedJob) return false;

    if (selectedJob.title && validateMaxLength(selectedJob.title, 30)) {
      return true;
    }
    if (selectedJob.description && validateMaxLength(selectedJob.description, 2000)) {
      return true;
    }
    if (selectedJob.requirements && validateMaxLength(selectedJob.requirements, 2000)) {
      return true;
    }
    if (selectedJob.benefits && validateMaxLength(selectedJob.benefits, 2000)) {
      return true;
    }
    if (selectedJob.selection_process && validateMaxLength(selectedJob.selection_process, 2000)) {
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

    const locationDetailError = validateRequired(selectedJob.location_detail, "勤務地/詳細");
    if (locationDetailError) errors.location_detail = locationDetailError;

    const descriptionError = validateRequired(selectedJob.description, "職務内容");
    if (descriptionError) errors.description = descriptionError;

    // 文字数制限のチェック
    if (selectedJob.title) {
      const titleError = validateMaxLength(selectedJob.title, 30, "求人タイトル");
      if (titleError) errors.title = titleError;
    }

    if (selectedJob.description) {
      const descriptionMaxError = validateMaxLength(selectedJob.description, 2000, "職務内容");
      if (descriptionMaxError) errors.description = descriptionMaxError;
    }

    if (selectedJob.requirements) {
      const requirementsError = validateMaxLength(selectedJob.requirements, 2000, "応募資格");
      if (requirementsError) errors.requirements = requirementsError;
    }

    if (selectedJob.benefits) {
      const benefitsError = validateMaxLength(selectedJob.benefits, 2000, "福利厚生・制度");
      if (benefitsError) errors.benefits = benefitsError;
    }

    if (selectedJob.selection_process) {
      const selectionProcessError = validateMaxLength(selectedJob.selection_process, 2000, "選考フロー");
      if (selectionProcessError) errors.selection_process = selectionProcessError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleBack = () => {
    handleNavigation("/studio/jobs");
  };

  // 審査申請の共通ロジック
  const { submitForReview, isSubmitting, error: submitError } = useDraftSubmit({
    onSave: async () => {
      if (!selectedJob) {
        return { error: "求人データが見つかりません" };
      }

      const jobData = {
        title: selectedJob.title || "",
        employment_type: selectedJob.employment_type || "",
        graduation_year: selectedJob.graduation_year || null,
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
    onSubmit: async (draftId) => {
      return await submitJobForReview(draftId);
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

  const handleSubmitForReview = async () => {
    if (!selectedJob) {
      setError("求人データが見つかりません");
      return;
    }

    // バリデーション
    if (!validateRequiredFields()) {
      setError("必須項目を入力してください");
      return;
    }

    if (Object.keys(fieldErrors).length > 0 || hasCharacterLimitErrors()) {
      setError("入力内容を確認してください");
      return;
    }

    // 審査申請（onSave内で保存処理が実行される）
    const currentDraftId = selectedJob.id;
    if (!currentDraftId && !isNew) {
      setError("ドラフトIDが見つかりません");
      return;
    }

    await submitForReview(currentDraftId || undefined);
  };

  // submitErrorも表示する
  useEffect(() => {
    if (submitError) {
      setError(submitError);
    }
  }, [submitError]);

  // 応募ステータスの日本語ラベル
  const statusLabels: Record<string, string> = {
    applied: "応募済み",
    document_screening: "書類選考",
    first_interview: "1次面接",
    second_interview: "2次面接",
    final_interview: "最終面接",
    offer: "内定",
    rejected: "不採用",
    withdrawn: "辞退"
  };

  // 利用可能な応募ステータスのリスト
  const availableStatuses: Array<keyof typeof statusLabels> = [
    "applied",
    "document_screening",
    "first_interview",
    "second_interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn"
  ];

  // 卒業年の選択肢を生成（現在年から5年後まで）
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  // 審査中（submitted）の場合は編集不可
  const isReadOnly = selectedJob?.draft_status === "submitted";

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
    status: selectedJob.status === "active" ? "published" : "private",
    description: selectedJob.description || "",
    requirements: selectedJob.requirements || "",
    benefits: selectedJob.benefits || "",
    selectionProcess: selectedJob.selection_process || "",
    companyName: "サンプル株式会社",
    companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
    workLocation: locationText || undefined,
    workConditions: selectedJob.employment_type || undefined,
    coverImage: selectedJob.cover_image_url || undefined
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={previewData}
        previewUrl="/studio/jobs/preview-content"
      />

      <ErrorMessage message={error || ""} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {isNew ? "新規求人作成" : "求人を編集"}
            </h1>
            <p className="text-gray-500 font-medium">求人の詳細情報を入力してください。</p>
          </div>
        </div>
        {/* 公開ステータス表示 */}
        {!isNew && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">公開ステータス:</span>
            <StudioBadge
              variant={
                selectedJob.status === "active" ? "success" : selectedJob.status === "pending" ? "neutral" : "neutral"
              }
            >
              {selectedJob.status === "active" ? "公開中" : selectedJob.status === "pending" ? "審査中" : "非公開"}
            </StudioBadge>
          </div>
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
                maxLength={30}
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
                <div className="space-y-2">
                  <StudioLabel required>勤務地/都道府県</StudioLabel>
                  <StudioSelect
                    name="prefecture"
                    value={selectedJob.prefecture || ""}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">選択してください</option>
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </StudioSelect>
                  {fieldErrors.prefecture && (
                    <p className="text-xs text-red-500 font-bold">{fieldErrors.prefecture}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <StudioFormField
                    label="勤務地/詳細"
                    name="location_detail"
                    value={selectedJob.location_detail || ""}
                    onChange={handleChange}
                    placeholder="例：港区、リモート可など"
                    required
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
                maxLength={2000}
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
                maxLength={2000}
                showCharCount
                error={fieldErrors.requirements}
                disabled={isReadOnly}
              />
              <StudioFormField
                label="福利厚生・制度"
                name="benefits"
                type="textarea"
                value={selectedJob.benefits || ""}
                onChange={handleChange}
                rows={4}
                maxLength={2000}
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
                maxLength={2000}
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
              <p className="text-sm text-gray-500 mt-1">求人詳細ページの上部に表示される画像を設定できます</p>
            </div>
            <div className="p-6">
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

          {/* 応募ステータス設定 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">応募ステータス設定</h2>
              <p className="text-sm text-gray-500 mt-1">この求人で使用する応募ステータスを選択してください</p>
            </div>
            <div className="p-6 space-y-3">
              {availableStatuses.map((status) => {
                const statusValue = status as JobPosting["available_statuses"][number];
                const isChecked = selectedJob.available_statuses?.includes(statusValue) || false;
                const isRequired = REQUIRED_STATUSES.includes(status);
                return (
                  <label
                    key={status}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isRequired ? "bg-gray-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isRequired || isReadOnly}
                      onChange={(e) => handleStatusChange(status, e.target.checked)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`text-sm font-medium ${isRequired ? "text-gray-600" : "text-gray-900"}`}>
                        {statusLabels[status]}
                      </span>
                      {isRequired ? (
                        <StudioBadge variant="error">必須</StudioBadge>
                      ) : (
                        <StudioBadge variant="neutral">任意</StudioBadge>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 画面下部のボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        onSubmitForReview={handleSubmitForReview}
        isSubmitting={isSubmitting || saving}
        isSubmitDisabled={isCoverImageUploading || Object.keys(fieldErrors).length > 0 || hasCharacterLimitErrors()}
        showSubmitButton={selectedJob?.draft_status !== "submitted"}
        publicPageUrl={selectedJob.production_job_id ? `/job/${selectedJob.production_job_id}` : undefined}
        hasChanges={hasJobChanges()}
      />
    </div>
  );
}

