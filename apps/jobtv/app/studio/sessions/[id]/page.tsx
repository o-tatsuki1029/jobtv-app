"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, ArrowLeft, Plus, Trash2 } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import {
  getSessionDraft,
  createSessionDraft,
  updateSessionDraft,
  uploadSessionDraftCoverImage,
  getSessionDates,
  saveSessionDates,
  submitSessionForReview
} from "@/lib/actions/session-actions";
import { useFormState } from "@/hooks/useFormState";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useDraftSubmit } from "@/hooks/useDraftSubmit";
import { validateRequired, validateMaxLength } from "@jobtv-app/shared/utils/validation";
import type { Tables } from "@jobtv-app/shared/types";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";

// 型定義（DBスキーマに合わせる）
type SessionDraft = Tables<"sessions_draft">;

interface Session extends Omit<SessionDraft, "draft_status"> {
  draft_status?: SessionDraft["draft_status"];
  production_session_id?: string | null;
  cover_image_url: string | null;
}

// 種類の選択肢
const SESSION_TYPES = ["説明会", "インターンシップ", "その他"];

// 場所タイプの選択肢
const LOCATION_TYPES = ["対面", "オンライン", "対面/オンライン"];

// 日程の型定義
interface SessionDate {
  id?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  capacity?: number | null;
}

export default function SessionEditPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const isNew = sessionId === "new";

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [initialSession, setInitialSession] = useState<Session | null>(null);
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([]);
  const [initialSessionDates, setInitialSessionDates] = useState<SessionDate[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [dateErrors, setDateErrors] = useState<Record<number, { event_date?: string; start_time?: string; end_time?: string }>>({});
  
  const {
    loading,
    saving,
    error,
    fieldErrors,
    setLoading,
    setSaving,
    setError,
    setFieldError,
    setFieldErrors,
    clearFieldErrors
  } = useFormState();

  // 変更検知関数
  const hasSessionChanges = useCallback((): boolean => {
    if (!selectedSession || !initialSession) return false;

    // 主要なフィールドを比較
    const fieldsToCompare: (keyof Session)[] = [
      "title",
      "type",
      "location_type",
      "location_detail",
      "capacity",
      "description",
      "cover_image_url"
    ];

    // フィールドの変更をチェック
    const fieldChanged = hasFieldChanges(selectedSession, initialSession, fieldsToCompare);

    // 日程の変更をチェック
    const datesChanged = hasArrayChanges(sessionDates, initialSessionDates);

    return hasChanges(fieldChanged, datesChanged);
  }, [selectedSession, initialSession, sessionDates, initialSessionDates]);

  // ページ離脱時の警告
  const { handleNavigation } = useUnsavedChanges(hasSessionChanges);

  // 説明会データを取得
  useEffect(() => {
    const loadSession = async () => {
      if (isNew) {
        // 新規作成の場合
        const today = new Date();
        const defaultDate = today.toISOString().split("T")[0];

        const newSession: Session = {
          id: "",
          company_id: "",
          title: "",
          type: "",
          location_type: "",
          location_detail: "",
          capacity: null,
          status: "pending",
          cover_image_url: null,
          description: "",
          created_by: "",
          created_at: "",
          updated_at: ""
        };
        setSelectedSession(newSession);
        setInitialSession(JSON.parse(JSON.stringify(newSession)));
        
        // 初期日程を1つ追加
        const initialDate: SessionDate = {
          event_date: defaultDate,
          start_time: "",
          end_time: "",
          capacity: null
        };
        setSessionDates([initialDate]);
        setInitialSessionDates([JSON.parse(JSON.stringify(initialDate))]);
        setLoading(false);
      } else {
        // 既存の説明会draftを取得
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await getSessionDraft(sessionId);
        if (fetchError) {
          setError(fetchError);
          setLoading(false);
          return;
        }

        if (data) {
          const sessionData = {
            ...data,
            cover_image_url: data.cover_image_url || null
          } as Session;
          setSelectedSession(sessionData);
          setInitialSession(JSON.parse(JSON.stringify(sessionData)));

          // 日程も取得（production_session_idがある場合のみ）
          const sessionIdForDates = data.production_session_id || sessionId;
          const { data: datesData } = await getSessionDates(sessionIdForDates);
          if (datesData) {
            const dates: SessionDate[] = datesData.map((d: any) => ({
              id: d.id,
              event_date: d.event_date,
              start_time: d.start_time,
              end_time: d.end_time,
              capacity: d.capacity || null
            }));
            setSessionDates(dates);
            setInitialSessionDates(JSON.parse(JSON.stringify(dates)));
          } else {
            setSessionDates([]);
            setInitialSessionDates([]);
          }
        }
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (selectedSession) {
      if (name === "capacity") {
        setSelectedSession({ ...selectedSession, [name]: value ? parseInt(value, 10) : null });
      } else {
        setSelectedSession({ ...selectedSession, [name]: value });
      }

      // 必須項目と文字数制限のチェック
      const newErrors: Partial<typeof fieldErrors> = {};

      // 必須項目のチェック
      if (name === "title") {
        const error = validateRequired(value, "タイトル");
        if (error) newErrors.title = error;
      }
      if (name === "type") {
        const error = validateRequired(value, "種類");
        if (error) newErrors.type = error;
      }
      if (name === "location_type") {
        const error = validateRequired(value, "場所タイプ");
        if (error) newErrors.location_type = error;
      }
      if (name === "location_detail") {
        const error = validateRequired(value, "場所詳細");
        if (error) newErrors.location_detail = error;
      }
      if (name === "description") {
        const error = validateRequired(value, "説明文");
        if (error) newErrors.description = error;
      }

      // 文字数制限のチェック
      if (name === "title") {
        const error = validateMaxLength(value, 30, "タイトル");
        if (error) newErrors.title = error;
      }
      if (name === "description") {
        const error = validateMaxLength(value, 2000, "説明文");
        if (error) newErrors.description = error;
      }

      // フィールドエラーを更新
      setFieldErrors((prev) => {
        const updated = { ...prev };
        if (newErrors[name as keyof typeof newErrors]) {
          updated[name as keyof typeof updated] = newErrors[name as keyof typeof updated] as string;
        } else if (updated[name as keyof typeof updated]) {
          // エラーが解消された場合は削除
          delete updated[name as keyof typeof updated];
        }
        return updated;
      });
    }
  };

  // 日程の変更を処理
  const handleDateChange = (index: number, field: keyof SessionDate, value: string | number | null) => {
    const newDates = [...sessionDates];
    newDates[index] = { ...newDates[index], [field]: value };
    setSessionDates(newDates);

    // バリデーション
    const newErrors: typeof dateErrors = { ...dateErrors };
    if (!newErrors[index]) {
      newErrors[index] = {};
    }

    if (field === "event_date" && (!value || (typeof value === "string" && value.trim() === ""))) {
      newErrors[index].event_date = "開催日は必須です";
    } else if (field === "event_date") {
      delete newErrors[index].event_date;
    }

    if (field === "start_time" && (!value || (typeof value === "string" && value.trim() === ""))) {
      newErrors[index].start_time = "開始時間は必須です";
    } else if (field === "start_time") {
      delete newErrors[index].start_time;
    }

    if (field === "end_time" && (!value || (typeof value === "string" && value.trim() === ""))) {
      newErrors[index].end_time = "終了時間は必須です";
    } else if (field === "end_time") {
      delete newErrors[index].end_time;
    }

    if (Object.keys(newErrors[index]).length === 0) {
      delete newErrors[index];
    }
    setDateErrors(newErrors);
  };

  // 日程を追加
  const handleAddDate = () => {
    const today = new Date();
    const defaultDate = today.toISOString().split("T")[0];
    setSessionDates([...sessionDates, { event_date: defaultDate, start_time: "", end_time: "", capacity: null }]);
  };

  // 日程を削除
  const handleRemoveDate = (index: number) => {
    if (sessionDates.length <= 1) {
      setError("最低1つの日程が必要です");
      return;
    }
    const newDates = sessionDates.filter((_, i) => i !== index);
    setSessionDates(newDates);
    
    // エラーも削除
    const newErrors = { ...dateErrors };
    delete newErrors[index];
    // インデックスを再マッピング
    const reindexedErrors: typeof dateErrors = {};
    Object.keys(newErrors).forEach((key) => {
      const oldIndex = parseInt(key, 10);
      if (oldIndex > index) {
        reindexedErrors[oldIndex - 1] = newErrors[oldIndex];
      } else {
        reindexedErrors[oldIndex] = newErrors[oldIndex];
      }
    });
    setDateErrors(reindexedErrors);
  };

  // 文字数制限のチェック
  const hasCharacterLimitErrors = (): boolean => {
    if (!selectedSession) return false;

    if (selectedSession.title && validateMaxLength(selectedSession.title, 30)) {
      return true;
    }
    if (selectedSession.description && validateMaxLength(selectedSession.description, 2000)) {
      return true;
    }

    return false;
  };

  // 必須項目のバリデーション
  const validateRequiredFields = (): boolean => {
    if (!selectedSession) return false;

    const errors: typeof fieldErrors = {};
    const dateErrs: typeof dateErrors = {};

    const titleError = validateRequired(selectedSession.title, "タイトル");
    if (titleError) errors.title = titleError;

    const typeError = validateRequired(selectedSession.type, "種類");
    if (typeError) errors.type = typeError;

    const locationTypeError = validateRequired(selectedSession.location_type, "場所タイプ");
    if (locationTypeError) errors.location_type = locationTypeError;

    const locationDetailError = validateRequired(selectedSession.location_detail, "場所詳細");
    if (locationDetailError) errors.location_detail = locationDetailError;

    const descriptionError = validateRequired(selectedSession.description, "説明文");
    if (descriptionError) errors.description = descriptionError;

    // 日程のバリデーション
    if (sessionDates.length === 0) {
      setError("最低1つの日程が必要です");
      return false;
    }

    sessionDates.forEach((date, index) => {
      if (!date.event_date || date.event_date.trim() === "") {
        if (!dateErrs[index]) dateErrs[index] = {};
        dateErrs[index].event_date = "開催日は必須です";
      }
      if (!date.start_time || date.start_time.trim() === "") {
        if (!dateErrs[index]) dateErrs[index] = {};
        dateErrs[index].start_time = "開始時間は必須です";
      }
      if (!date.end_time || date.end_time.trim() === "") {
        if (!dateErrs[index]) dateErrs[index] = {};
        dateErrs[index].end_time = "終了時間は必須です";
      }
    });

    setFieldErrors(errors);
    setDateErrors(dateErrs);
    return Object.keys(errors).length === 0 && Object.keys(dateErrs).length === 0;
  };


  const handleBack = () => {
    handleNavigation("/studio/sessions");
  };

  // 審査申請の共通ロジック
  const { submitForReview, isSubmitting, error: submitError } = useDraftSubmit({
    onSave: async () => {
      if (!selectedSession) {
        return { error: "説明会データが見つかりません" };
      }

      const sessionData = {
        title: selectedSession.title,
        type: selectedSession.type,
        location_type: selectedSession.location_type,
        location_detail: selectedSession.location_detail,
        capacity: selectedSession.capacity || null,
        description: selectedSession.description,
        cover_image_url: selectedSession.cover_image_url || null
      };

      let draftId = selectedSession.id;

      // 新規作成または既存のdraftを更新
      if (isNew || !draftId) {
        const createResult = await createSessionDraft(sessionData);
        if (createResult.error) {
          return { error: createResult.error };
        }
        draftId = createResult.data?.id || "";
        if (createResult.data) {
          setSelectedSession({ ...selectedSession, id: draftId });
        }
      } else {
        const updateResult = await updateSessionDraft(draftId, sessionData);
        if (updateResult.error) {
          return { error: updateResult.error };
        }
      }

      // 日程を保存
      if (draftId) {
        const datesToSave = sessionDates.map((date) => ({
          event_date: date.event_date,
          start_time: date.start_time,
          end_time: date.end_time,
          capacity: date.capacity || null
        }));

        const datesResult = await saveSessionDates(draftId, datesToSave);
        if (datesResult.error) {
          return { error: datesResult.error };
        }
      }

      return { error: null, draftId };
    },
    onSubmit: async (draftId) => {
      return await submitSessionForReview(draftId);
    },
    validate: () => {
      if (!validateRequiredFields()) {
        return "必須項目を入力してください";
      }
      if (Object.keys(fieldErrors).length > 0 || Object.keys(dateErrors).length > 0 || hasCharacterLimitErrors()) {
        return "入力内容を確認してください";
      }
      return null;
    },
    redirectTo: "/studio/sessions"
  });

  const handleSubmitForReview = async () => {
    if (!selectedSession) {
      setError("説明会データが見つかりません");
      return;
    }

    // バリデーション
    if (!validateRequiredFields()) {
      setError("必須項目を入力してください");
      return;
    }

    if (Object.keys(fieldErrors).length > 0 || Object.keys(dateErrors).length > 0 || hasCharacterLimitErrors()) {
      setError("入力内容を確認してください");
      return;
    }

    // 審査申請（onSave内で保存処理が実行される）
    const currentDraftId = selectedSession.id;
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 font-medium">説明会が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24">
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={{}}
        previewUrl="/studio/sessions/preview-content"
      />

      <ErrorMessage message={error || ""} />

      {/* 審査中（submitted）の場合は編集不可 */}
      {(() => {
        const isReadOnly = selectedSession?.draft_status === "submitted";
        
        return (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {isNew ? "新規説明会作成" : "説明会を編集"}
            </h1>
            <p className="text-gray-500 font-medium">説明会の詳細情報を入力してください。</p>
          </div>
        </div>
        {/* 公開ステータス表示 */}
        {!isNew && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">公開ステータス:</span>
            <StudioBadge
              variant={
                selectedSession.status === "active" ? "success" : selectedSession.status === "pending" ? "neutral" : "neutral"
              }
            >
              {selectedSession.status === "active" ? "公開中" : selectedSession.status === "pending" ? "審査中" : "終了"}
            </StudioBadge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg text-gray-900">基本情報</h2>
            </div>
            <div className="p-8 space-y-6">
              <StudioFormField
                label="タイトル"
                name="title"
                value={selectedSession.title}
                onChange={handleChange}
                placeholder="タイトルを入力"
                required
                maxLength={30}
                showCharCount
                error={fieldErrors.title}
                disabled={isReadOnly}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <StudioLabel required>種類</StudioLabel>
                  <StudioSelect name="type" value={selectedSession.type || ""} onChange={handleChange} required disabled={isReadOnly}>
                    <option value="">選択してください</option>
                    {SESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </StudioSelect>
                  {fieldErrors.type && <p className="text-xs text-red-500 font-bold">{fieldErrors.type}</p>}
                </div>
                <div className="space-y-2">
                  <StudioLabel required>場所タイプ</StudioLabel>
                  <StudioSelect
                    name="location_type"
                    value={selectedSession.location_type || ""}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">選択してください</option>
                    {LOCATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </StudioSelect>
                  {fieldErrors.location_type && (
                    <p className="text-xs text-red-500 font-bold">{fieldErrors.location_type}</p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <StudioFormField
                    label="場所詳細"
                    name="location_detail"
                    value={selectedSession.location_detail || ""}
                    onChange={handleChange}
                    placeholder="例：オンライン (Zoom) / 六本木オフィス"
                    required
                    error={fieldErrors.location_detail}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <StudioFormField
                label="説明文"
                name="description"
                type="textarea"
                value={selectedSession.description || ""}
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

          {/* 日程管理 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h2 className="font-bold text-base text-gray-900">日程</h2>
                <StudioBadge variant="error">必須</StudioBadge>
              </div>
              <StudioButton size="sm" icon={<Plus className="w-3 h-3" />} onClick={handleAddDate} disabled={isReadOnly}>
                追加
              </StudioButton>
            </div>
            <div className="p-4 space-y-3">
              {sessionDates.map((date, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">日程 {index + 1}</span>
                    {sessionDates.length > 1 && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(index)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <StudioLabel required className="text-xs">開催日</StudioLabel>
                      <input
                        type="date"
                        value={date.event_date || ""}
                        onChange={(e) => handleDateChange(index, "event_date", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-xs transition-all"
                        required
                        disabled={isReadOnly}
                      />
                      {dateErrors[index]?.event_date && (
                        <p className="text-[10px] text-red-500 font-bold">{dateErrors[index].event_date}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <StudioLabel required className="text-xs">開始時間</StudioLabel>
                      <input
                        type="time"
                        value={date.start_time || ""}
                        onChange={(e) => handleDateChange(index, "start_time", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-xs transition-all"
                        required
                        disabled={isReadOnly}
                      />
                      {dateErrors[index]?.start_time && (
                        <p className="text-[10px] text-red-500 font-bold">{dateErrors[index].start_time}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <StudioLabel className="text-xs">終了時間</StudioLabel>
                      <input
                        type="time"
                        value={date.end_time || ""}
                        onChange={(e) => handleDateChange(index, "end_time", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-xs transition-all"
                        required
                        disabled={isReadOnly}
                      />
                      {dateErrors[index]?.end_time && (
                        <p className="text-[10px] text-red-500 font-bold">{dateErrors[index].end_time}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <StudioLabel className="text-xs">定員</StudioLabel>
                      <input
                        type="number"
                        value={date.capacity || ""}
                        onChange={(e) =>
                          handleDateChange(index, "capacity", e.target.value ? parseInt(e.target.value, 10) : null)
                        }
                        min="1"
                        placeholder="任意"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-xs transition-all"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="text-sm text-gray-500 mt-1">説明会詳細ページの上部に表示される画像を設定できます</p>
            </div>
            <div className="p-6">
              <StudioImageUpload
                label=""
                type="cover"
                currentUrl={selectedSession.cover_image_url || undefined}
                onUploadComplete={(url) => {
                  if (selectedSession) {
                    setSelectedSession({ ...selectedSession, cover_image_url: url || null });
                  }
                }}
                onUploadingChange={setIsCoverImageUploading}
                onError={(error) => {
                  setError(error);
                }}
                aspectRatio="wide"
                helperText="1200x400px 以上を推奨"
                customUploadFunction={async (file: File) => {
                  return await uploadSessionDraftCoverImage(file, selectedSession.id || undefined);
                }}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 画面下部のボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        onSubmitForReview={handleSubmitForReview}
        isSubmitting={isSubmitting || saving}
        isSubmitDisabled={
          isCoverImageUploading ||
          Object.keys(fieldErrors).length > 0 ||
          Object.keys(dateErrors).length > 0 ||
          hasCharacterLimitErrors()
        }
        showSubmitButton={selectedSession?.draft_status !== "submitted"}
        publicPageUrl={selectedSession.production_session_id ? `/session/${selectedSession.production_session_id}` : undefined}
        hasChanges={hasSessionChanges()}
      />
          </>
        );
      })()}
    </div>
  );
}

