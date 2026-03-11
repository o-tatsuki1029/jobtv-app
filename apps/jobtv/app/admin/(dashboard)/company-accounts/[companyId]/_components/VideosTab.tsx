"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Pencil, Upload, Loader2 } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import Tabs from "@/components/studio/molecules/Tabs";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import {
  adminGetVideosForCompany,
  adminSaveVideo,
} from "@/lib/actions/admin-company-detail-actions";
import {
  uploadVideoToS3Action,
  uploadThumbnailToS3Action,
  saveMediaConvertJobToDraft,
} from "@/lib/actions/video-actions";
import { VIDEO_CATEGORIES } from "@/types/video.types";
import type { VideoCategory } from "@/types/video.types";

interface VideosTabProps {
  companyId: string;
}

const CATEGORY_TABS = VIDEO_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  color: "black" as const,
}));

export default function VideosTab({ companyId }: VideosTabProps) {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<VideoCategory>("main");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    category: "main" as VideoCategory,
  });

  const loadVideos = async () => {
    setLoading(true);
    const { data } = await adminGetVideosForCompany(companyId);
    if (data) setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, [companyId]);

  const filteredVideos = videos.filter((v) => v.category === activeCategory);
  const categoryInfo = VIDEO_CATEGORIES.find((c) => c.id === activeCategory);
  const maxCount = categoryInfo?.maxCount || 10;
  const canAdd = filteredVideos.length < maxCount;

  const openCreateModal = () => {
    setEditingVideo(null);
    setForm({ title: "", category: activeCategory });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (video: any) => {
    setEditingVideo(video);
    setForm({
      title: video.title || "",
      category: video.category || activeCategory,
    });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingVideo?.id) return;

    setUploading(true);
    setSaveError(null);

    const { data, error } = await uploadVideoToS3Action(file, "landscape", editingVideo.id);

    if (error) {
      setSaveError(error);
      setUploading(false);
      return;
    }

    if (data?.jobId) {
      await saveMediaConvertJobToDraft(editingVideo.id, data.jobId, "landscape", data.url || "");
      // ドラフトの変換ステータスが更新される
      await loadVideos();
      // 編集中の動画を更新
      const { data: refreshed } = await adminGetVideosForCompany(companyId);
      if (refreshed) {
        const updated = refreshed.find((v: any) => v.id === editingVideo.id);
        if (updated) setEditingVideo(updated);
      }
    }

    setUploading(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingVideo?.id) return;

    setUploadingThumbnail(true);
    setSaveError(null);

    const { error } = await uploadThumbnailToS3Action(file, editingVideo.id);

    if (error) {
      setSaveError(error);
    } else {
      await loadVideos();
      const { data: refreshed } = await adminGetVideosForCompany(companyId);
      if (refreshed) {
        const updated = refreshed.find((v: any) => v.id === editingVideo.id);
        if (updated) setEditingVideo(updated);
      }
    }

    setUploadingThumbnail(false);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setSaveError("タイトルは必須です");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const { data: result, error } = await adminSaveVideo(
      companyId,
      editingVideo?.id || null,
      {
        title: form.title,
        category: form.category,
      }
    );

    if (error) {
      setSaveError(error);
    } else {
      await loadVideos();
      // 新規作成の場合、作成されたドラフトの編集モーダルを開く（動画アップロードのため）
      if (!editingVideo && result?.id) {
        const { data: refreshed } = await adminGetVideosForCompany(companyId);
        if (refreshed) {
          setVideos(refreshed);
          const newDraft = refreshed.find((v: any) => v.id === result.id);
          if (newDraft) {
            setEditingVideo(newDraft);
            setForm({ title: newDraft.title || "", category: newDraft.category || activeCategory });
            return; // モーダルを開いたままにする
          }
        }
      }
      setIsModalOpen(false);
    }
    setSaving(false);
  };

  const getConversionBadge = (video: any) => {
    switch (video.conversion_status) {
      case "completed":
        return <StudioBadge variant="success">変換完了</StudioBadge>;
      case "processing":
        return <StudioBadge variant="info">変換中</StudioBadge>;
      case "failed":
        return <StudioBadge variant="error">変換失敗</StudioBadge>;
      case "pending":
        return <StudioBadge variant="warning">変換待ち</StudioBadge>;
      default:
        return <StudioBadge variant="neutral">未アップロード</StudioBadge>;
    }
  };

  const getStatusBadge = (video: any) => {
    if (video.production_status === "active") return <StudioBadge variant="success">公開中</StudioBadge>;
    if (video.production_video_id) return <StudioBadge variant="neutral">非公開</StudioBadge>;
    return <StudioBadge variant="warning">{video.draft_status === "submitted" ? "審査中" : "下書き"}</StudioBadge>;
  };

  const tabsWithCount = CATEGORY_TABS.map((tab) => ({
    ...tab,
    count: videos.filter((v) => v.category === tab.id).length,
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Tabs
        tabs={tabsWithCount}
        activeTab={activeCategory}
        onTabChange={(id) => setActiveCategory(id as VideoCategory)}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {categoryInfo?.label}（{filteredVideos.length}/{maxCount}）
          </h2>
          <StudioButton
            icon={<Plus className="w-4 h-4" />}
            size="sm"
            onClick={openCreateModal}
            disabled={!canAdd}
          >
            新規動画を追加
          </StudioButton>
        </div>
        <div className="overflow-x-auto">
          {filteredVideos.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>動画がありません</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">タイトル</th>
                  <th className="px-6 py-4">変換</th>
                  <th className="px-6 py-4">ステータス</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{video.title || "無題"}</td>
                    <td className="px-6 py-4">{getConversionBadge(video)}</td>
                    <td className="px-6 py-4">{getStatusBadge(video)}</td>
                    <td className="px-6 py-4">
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<Pencil className="w-3 h-3" />}
                        onClick={() => openEditModal(video)}
                      >
                        編集
                      </StudioButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 動画編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !saving && !uploading && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={saving || uploading}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingVideo ? "動画を編集" : "新規動画"}
              </h2>
            </div>

            <div className="p-8 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{saveError}</p>
                </div>
              )}

              <StudioFormField
                label="タイトル"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="動画タイトル（30字以内）"
                maxLength={30}
                showCharCount
                required
                disabled={saving}
              />

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">カテゴリ</label>
                <p className="px-4 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-700">
                  {VIDEO_CATEGORIES.find((c) => c.id === form.category)?.label || form.category}
                </p>
              </div>

              {/* 動画アップロード（既存ドラフトの場合のみ） */}
              {editingVideo && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">動画ファイル</label>
                    {editingVideo.conversion_status && (
                      <div className="flex items-center gap-2 mb-2">
                        {getConversionBadge(editingVideo)}
                      </div>
                    )}
                    <div
                      className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => !uploading && videoInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">
                        {uploading ? "アップロード中..." : "動画ファイルを選択（横長 16:9 推奨、1920x1080）"}
                      </span>
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">サムネイル</label>
                    {editingVideo.thumbnail_url && (
                      <div className="mb-2">
                        <img
                          src={editingVideo.thumbnail_url}
                          alt="サムネイル"
                          className="w-40 h-auto rounded-lg border"
                        />
                      </div>
                    )}
                    <div
                      className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => !uploadingThumbnail && thumbnailInputRef.current?.click()}
                    >
                      {uploadingThumbnail ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">
                        {uploadingThumbnail ? "アップロード中..." : "サムネイル画像を選択"}
                      </span>
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </div>
                </>
              )}

              {!editingVideo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    まず保存してドラフトを作成してから、動画ファイルをアップロードしてください。
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving || uploading}
              >
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleSave} disabled={saving || uploading}>
                {saving ? "保存中..." : "保存"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
