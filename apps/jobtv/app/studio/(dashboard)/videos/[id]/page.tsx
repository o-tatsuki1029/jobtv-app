"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioBackButton from "@/components/studio/atoms/StudioBackButton";
import VideoEditor from "@/components/studio/video/VideoEditor";
import StudioEditorStatusSection from "@/components/studio/molecules/StudioEditorStatusSection";
import StudioEditorAlerts from "@/components/studio/molecules/StudioEditorAlerts";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import { useStudioEditor } from "@/hooks/useStudioEditor";
import {
  getVideoDraftById,
  createVideoDraft,
  updateVideoDraft,
  submitVideoForReview,
  uploadVideoToS3Action,
  uploadThumbnailToS3Action,
  saveMediaConvertJobToDraft
} from "@/lib/actions/video-actions";
import type { VideoFormData, VideoCategory, VideoDraft, VideoDraftItem } from "@/types/video.types";

const VALID_CATEGORIES: VideoCategory[] = ["main", "short", "documentary"];

function categoryFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): VideoCategory {
  const category = searchParams.get("category");
  if (category && VALID_CATEGORIES.includes(category as VideoCategory)) return category as VideoCategory;
  return "documentary";
}

export default function VideoEditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isNew = id === "new";
  const initialCategoryFromQuery = categoryFromSearchParams(searchParams);

  const [video, setVideo] = useState<VideoDraftItem | null>(null);
  const [initialVideo, setInitialVideo] = useState<VideoDraftItem | null>(null);
  const [formData, setFormData] = useState<VideoFormData>({
    title: "",
    video_url: "",
    thumbnail_url: "",
    category: "" as any,
    display_order: 0
  });
  const [isLoading, setIsLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const pendingJobRef = useRef<{
    jobId: string;
    aspectRatio: "landscape" | "portrait";
    s3VideoId: string;
  } | null>(null);

  // データ取得
  useEffect(() => {
    if (!isNew) {
      loadVideo();
    } else {
      const newVideo: Partial<VideoDraft> = {
        id: "",
        company_id: "",
        title: "",
        video_url: "",
        thumbnail_url: null,
        category: initialCategoryFromQuery,
        display_order: 0,
        draft_status: "draft"
      };
      setVideo(newVideo as VideoDraftItem);
      setInitialVideo(newVideo as VideoDraftItem);
      setFormData({
        title: "",
        video_url: "",
        thumbnail_url: "",
        category: initialCategoryFromQuery,
        display_order: 0
      });
    }
  }, [id, isNew, initialCategoryFromQuery]);

  const loadVideo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getVideoDraftById(id);
      if (result.error) {
        setError(result.error);
        setVideo(null);
      } else if (result.data) {
        setVideo(result.data);
        setInitialVideo(JSON.parse(JSON.stringify(result.data)));
        setFormData({
          title: result.data.title,
          video_url: result.data.video_url,
          thumbnail_url: result.data.thumbnail_url || "",
          category: result.data.category,
          display_order: result.data.display_order
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "動画の読み込みに失敗しました");
      setVideo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 共通スタジオエディターフックの使用
  const {
    isReadOnly,
    showUnderReviewAlert,
    showOlderVersionAlert,
    submitForReview,
    isSubmittingReview,
    error: studioError,
    isPreviewOpen,
    setIsPreviewOpen,
    previewDevice,
    setPreviewDevice
  } = useStudioEditor({
    type: "company_page", // ビデオ専用のタイプがないためcompany_pageを流用
    id: id || "new",
    data: video
      ? {
          id: video.id,
          draft_status: video.draft_status,
          production_status: undefined,
          production_id: video.production_video_id
        }
      : null,
    onSave: async () => {
      try {
        if (isNew) {
          const result = await createVideoDraft(formData);
          if (result.error) return { error: result.error };
          // 新規動画でジョブIDがpending状態なら紐付ける
          const newDraftId = result.data?.id;
          if (newDraftId && pendingJobRef.current) {
            await saveMediaConvertJobToDraft(
              newDraftId,
              pendingJobRef.current.jobId,
              pendingJobRef.current.aspectRatio,
              pendingJobRef.current.s3VideoId
            );
            pendingJobRef.current = null;
            // ポーリング開始のためにドラフトを再取得
            const refreshed = await getVideoDraftById(newDraftId);
            if (refreshed.data) {
              setVideo(refreshed.data);
              setInitialVideo(JSON.parse(JSON.stringify(refreshed.data)));
            }
          }
          return { error: null, draftId: newDraftId };
        } else {
          const result = await updateVideoDraft(id, formData);
          if (result.error) return { error: result.error };
          return { error: null, draftId: id };
        }
      } catch (err) {
        return { error: "保存に失敗しました" };
      }
    },
    onSubmit: async (draftId) => {
      return await submitVideoForReview(draftId);
    },
    onToggleStatus: async () => {
      return { data: null, error: null };
    },
    validate: () => {
      if (!formData.category) {
        return "カテゴリーを選択してください";
      }
      if (!formData.title || formData.title.trim() === "") {
        return "タイトルは必須項目です";
      }
      if (formData.title.length > 30) {
        return "タイトルは30文字以内で入力してください";
      }
      if (!formData.video_url || formData.video_url.trim() === "") {
        return "動画URLは必須項目です";
      }
      return null;
    },
    redirectTo: `/studio/videos?tab=${formData.category || "main"}`
  });

  // 変更検知
  const hasVideoChanges = useCallback(() => {
    if (!formData || !initialVideo) return false;
    return (
      formData.title !== initialVideo.title ||
      formData.video_url !== initialVideo.video_url ||
      (formData.thumbnail_url || null) !== initialVideo.thumbnail_url ||
      formData.category !== initialVideo.category ||
      formData.display_order !== initialVideo.display_order
    );
  }, [formData, initialVideo]);

  // 動画アップロード
  const handleVideoUpload = async (file: File, aspectRatio: "landscape" | "portrait") => {
    const result = await uploadVideoToS3Action(file, aspectRatio, isNew ? undefined : id);

    // 新規動画の場合はジョブ情報をrefに保存し、保存後に紐付ける（s3VideoIdでURLをDBに書き込む）
    if (isNew && result.data?.jobId && result.data?.s3VideoId) {
      pendingJobRef.current = {
        jobId: result.data.jobId,
        aspectRatio,
        s3VideoId: result.data.s3VideoId
      };
    }

    return {
      success: !result.error,
      url: result.data?.url || null,
      error: result.error || undefined,
      jobId: result.data?.jobId
    };
  };

  // サムネイルアップロード（AWS S3を使用）
  const handleThumbnailUpload = async (file: File) => {
    const result = await uploadThumbnailToS3Action(file, id === "new" ? undefined : id);
    return {
      success: !result.error,
      url: result.data?.url || null,
      error: result.error || undefined
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner message="動画を読み込んでいます..." />
      </div>
    );
  }

  if (!isNew && !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ErrorMessage message={error || "動画が見つかりません"} />
        <StudioBackButton href={`/studio/videos?tab=${formData.category || "main"}`} className="bg-white border border-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={{
          ...formData,
          // 変換完了時はストリーミングURL、未完了時は元のS3 URLを使用
          video_url: (video as any)?.streaming_url || formData.video_url
        } as any}
        previewUrl="/studio/videos/preview-content"
      />

      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudioBackButton href={`/studio/videos?tab=${formData.category || "main"}`} />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">
              {isNew ? "新規動画を追加" : "動画を編集"}
            </h1>
            <p className="text-gray-500 font-medium">{isNew ? "新しい動画を追加します" : video?.title}</p>
          </div>
        </div>
        {!isNew && video && (
          <StudioEditorStatusSection
            draftStatus={video.draft_status}
            productionStatus={undefined}
            onToggleStatus={() => {}}
            hasProduction={false}
            disabled
          />
        )}
      </div>

      {/* アラート */}
      {!isNew && (
        <StudioEditorAlerts showUnderReviewAlert={showUnderReviewAlert} showOlderVersionAlert={showOlderVersionAlert} />
      )}

      {/* エラー表示 */}
      {(error || studioError) && <ErrorMessage message={error || studioError || ""} />}

      {/* エディター */}
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-sm p-8 ${
          isReadOnly ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <VideoEditor
          formData={formData}
          onChange={setFormData}
          onUploadVideo={handleVideoUpload}
          onUploadThumbnail={handleThumbnailUpload}
          readOnly={isReadOnly}
          categoryDisabled
        />
      </div>

      {/* アクションボタン */}
      <DraftActionButtons
        onPreview={() => setIsPreviewOpen(true)}
        showPreviewButton={true}
        onSubmitForReview={submitForReview}
        isSubmitting={isSubmittingReview}
        isSubmitDisabled={isReadOnly || !formData.video_url || !formData.title}
        showSubmitButton={!isReadOnly}
        hasChanges={hasVideoChanges() || isNew}
      />
    </div>
  );
}
