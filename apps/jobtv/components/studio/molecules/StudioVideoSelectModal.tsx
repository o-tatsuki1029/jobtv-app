"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Edit2, Trash2, Video as VideoIcon, Check } from "lucide-react";
import { getCompanyProfileWithPage } from "@/lib/actions/company-profile-actions";
import { getCompanyPage, saveCompanyPageVideos } from "@/lib/actions/company-page-actions";
import { dbToCompanyData, companyDataToFormData } from "@/components/company";
import type { CompanyData } from "@/components/company";
import StudioButton from "../atoms/StudioButton";
import StudioFormField from "./StudioFormField";
import StudioImageUpload from "./StudioImageUpload";
import { uploadCompanyAsset } from "@/lib/actions/company-profile-actions";

// 動画データのパース関数
const parseVideos = (videos: any): VideoItem[] => {
  if (!videos) return [];

  let parsedVideos: any[] = [];
  if (typeof videos === "string") {
    try {
      parsedVideos = JSON.parse(videos);
    } catch (e) {
      console.error("Failed to parse videos JSON:", e);
      return [];
    }
  } else if (Array.isArray(videos)) {
    parsedVideos = videos;
  } else {
    return [];
  }

  return parsedVideos.map((v: any) => ({
    id: v.id || crypto.randomUUID(),
    title: v.title || "",
    video: v.video_url || v.video || "",
    thumbnail: v.thumbnail_url || v.thumbnail
  }));
};

export interface VideoItem {
  id: string;
  title: string;
  video: string;
  thumbnail?: string;
}

interface StudioVideoSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  currentVideos: VideoItem[];
  onSelect: (videos: VideoItem[]) => void;
  onError?: (error: string) => void;
  maxSelection?: number; // 最大選択数（メインビデオの場合は1）
}

export default function StudioVideoSelectModal({
  isOpen,
  onClose,
  label,
  currentVideos,
  onSelect,
  onError,
  maxSelection
}: StudioVideoSelectModalProps) {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  // モーダルが開いたときに動画一覧を取得
  useEffect(() => {
    if (isOpen) {
      // 編集状態をリセット
      setEditingVideo(null);
      // 動画一覧を取得（毎回最新のデータを取得）
      fetchAllVideos();
    }
  }, [isOpen]);

  // currentVideosが変更されたときに選択状態を更新
  useEffect(() => {
    if (isOpen) {
      setSelectedVideoIds(new Set(currentVideos.map((v) => v.id)));
    }
  }, [isOpen, currentVideos]);

  const fetchAllVideos = async () => {
    setIsLoading(true);
    try {
      // companiesとcompany_pagesからデータを取得（共通関数を使用）
      const result = await getCompanyProfileWithPage();

      if (result.error) {
        onError?.(result.error);
        setAllVideos([]);
        setCompanyData(null);
      } else if (result.data) {
        const data = dbToCompanyData(result.data);
        setCompanyData(data);
        // company_videosから動画一覧を取得
        const companyVideos = (result.data as any).company_videos;
        const all = parseVideos(companyVideos);
        setAllVideos(all);
        console.log("Fetched videos:", all);
      } else {
        setAllVideos([]);
        setCompanyData(null);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      onError?.(error instanceof Error ? error.message : "動画一覧の取得に失敗しました");
      setAllVideos([]);
      setCompanyData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (videoId: string) => {
    const newSelected = new Set(selectedVideoIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      // 最大選択数のチェック
      if (maxSelection && newSelected.size >= maxSelection) {
        if (maxSelection === 1) {
          // 1つだけ選択可能な場合は、既存の選択を解除して新しいものを選択
          newSelected.clear();
          newSelected.add(videoId);
        } else {
          // 複数選択可能だが上限に達している場合は何もしない
          return;
        }
      } else {
        newSelected.add(videoId);
      }
    }
    setSelectedVideoIds(newSelected);
  };

  const handleEdit = (video: VideoItem) => {
    setEditingVideo({ ...video });
  };

  const handleSaveEdit = async () => {
    if (!editingVideo || !editingVideo.title || !editingVideo.video) return;

    setIsSaving(true);
    try {
      // 新規追加か既存の編集かを判定
      const isNew = !allVideos.some((v) => v.id === editingVideo.id);

      // ローカル状態を更新
      if (isNew) {
        setAllVideos([...allVideos, editingVideo]);
        const newSelected = new Set(selectedVideoIds);
        newSelected.add(editingVideo.id);
        setSelectedVideoIds(newSelected);
      } else {
        const updated = allVideos.map((v) => (v.id === editingVideo.id ? editingVideo : v));
        setAllVideos(updated);
      }

      // データベースに保存（company_videosに保存）
      // 最新のcompany_videosを取得するために、再度データを取得
      const latestPageResult = await getCompanyPage();
      if (latestPageResult.error) {
        onError?.(latestPageResult.error);
        return;
      }

      if (latestPageResult.data) {
        const videoData = {
          id: editingVideo.id,
          title: editingVideo.title,
          video_url: editingVideo.video,
          thumbnail_url: editingVideo.thumbnail
        };

        // 最新のcompany_videosを取得
        const latestCompanyVideos = parseVideos((latestPageResult.data as any).company_videos || []);

        let updatedCompanyVideos: any[];
        if (isNew) {
          // 新規追加の場合：既存の動画に追加
          updatedCompanyVideos = [...latestCompanyVideos, videoData];
        } else {
          // 既存の編集の場合：該当する動画を更新
          updatedCompanyVideos = latestCompanyVideos.map((v: any) => (v.id === editingVideo.id ? videoData : v));
        }

        // company_videosのみを更新するフォームデータを作成
        const formData: any = {
          company_videos: updatedCompanyVideos
        };

        const result = await saveCompanyPageVideos(formData);
        if (result.error) {
          onError?.(result.error);
        } else if (result.data) {
          // 保存成功後、最新データを取得
          const companyVideos = parseVideos((result.data as any).company_videos);
          setAllVideos(companyVideos);
          // companyDataも更新（共通関数を使用）
          const refreshResult = await getCompanyProfileWithPage();
          if (refreshResult.data) {
            const updatedData = dbToCompanyData(refreshResult.data);
            setCompanyData(updatedData);
          }
        }
      }

      setEditingVideo(null);
    } catch (error) {
      console.error("Error saving video:", error);
      onError?.(error instanceof Error ? error.message : "動画の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("この動画を削除しますか？")) return;

    setIsSaving(true);
    try {
      // ローカル状態を更新
      const updated = allVideos.filter((v) => v.id !== videoId);
      setAllVideos(updated);
      const newSelected = new Set(selectedVideoIds);
      newSelected.delete(videoId);
      setSelectedVideoIds(newSelected);

      // データベースから削除（company_videosから削除）
      const latestPageResult = await getCompanyPage();
      if (latestPageResult.data) {
        const currentCompanyVideos = parseVideos((latestPageResult.data as any).company_videos || []);
        const updatedCompanyVideos = currentCompanyVideos.filter((v: any) => v.id !== videoId);

        const formData: any = {
          company_videos: updatedCompanyVideos
        };

        const result = await saveCompanyPageVideos(formData);
        if (result.error) {
          onError?.(result.error);
          // エラー時は元に戻す
          const all = parseVideos((latestPageResult.data as any).company_videos || []);
          setAllVideos(all);
        } else if (result.data) {
          // 保存成功後、最新データを取得
          const companyVideos = parseVideos((result.data as any).company_videos);
          setAllVideos(companyVideos);
          // companyDataも更新（共通関数を使用）
          const refreshResult = await getCompanyProfileWithPage();
          if (refreshResult.data) {
            const updatedData = dbToCompanyData(refreshResult.data);
            setCompanyData(updatedData);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      onError?.(error instanceof Error ? error.message : "動画の削除に失敗しました");
      // エラー時は元に戻す
      if (companyData) {
        const all = parseVideos((companyData as any).company_videos || []);
        setAllVideos(all);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title: "",
      video: "",
      thumbnail: undefined
    };
    setEditingVideo(newVideo);
    // 新規追加時はallVideosに追加しない（保存時に追加する）
  };

  const handleVideoChange = (field: "title" | "video" | "thumbnail", value: string) => {
    if (!editingVideo) return;
    setEditingVideo({ ...editingVideo, [field]: value });
  };

  const handleVideoUpload = async (file: File) => {
    if (!editingVideo) return;

    setUploadingVideoId(editingVideo.id);
    setIsUploading(true);
    try {
      const result = await uploadCompanyAsset(file, "video");
      if (result.error) {
        onError?.(result.error);
      } else if (result.data) {
        handleVideoChange("video", result.data);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "動画のアップロードに失敗しました");
    } finally {
      setUploadingVideoId(null);
      setIsUploading(false);
    }
  };

  const handleThumbnailUpload = async (url: string) => {
    if (!editingVideo) return;
    handleVideoChange("thumbnail", url);
  };

  const handleThumbnailUploadingChange = useCallback((uploading: boolean) => {
    setIsThumbnailUploading(uploading);
  }, []);

  const handleApply = () => {
    const selected = allVideos.filter((v) => selectedVideoIds.has(v.id));
    console.log("Applying selected videos:", selected);
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-black">{label}の選択</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : editingVideo ? (
            /* 編集フォーム */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h3 className="text-lg font-black">
                  動画を{allVideos.some((v) => v.id === editingVideo.id) ? "編集" : "追加"}
                </h3>
                <button
                  onClick={() => {
                    if (!allVideos.some((v) => v.id === editingVideo.id)) {
                      // 新規追加の場合、リストから削除
                      setAllVideos(allVideos.filter((v) => v.id !== editingVideo.id));
                    }
                    setEditingVideo(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側: プレビュー */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">プレビュー</label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      {editingVideo.thumbnail ? (
                        <div className="relative w-full aspect-video">
                          <img
                            src={editingVideo.thumbnail}
                            alt={editingVideo.title || "プレビュー"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : editingVideo.video ? (
                        <div className="relative w-full aspect-video bg-black">
                          <video src={editingVideo.video} controls className="w-full h-full" />
                        </div>
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <VideoIcon className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">
                              プレビューを表示するには動画をアップロードしてください
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右側: フォーム */}
                <div className="space-y-6">
                  <StudioFormField
                    label="タイトル"
                    name="video-title"
                    value={editingVideo.title}
                    onChange={(e) => handleVideoChange("title", e.target.value)}
                    placeholder="例: 社員の1日 - エンジニア編"
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      動画ファイル <span className="text-red-500">*</span>
                    </label>
                    {editingVideo.video ? (
                      <div className="space-y-3">
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="text-xs text-gray-600 truncate font-mono">{editingVideo.video}</p>
                        </div>
                        <button
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "video/mp4,video/webm";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleVideoUpload(file);
                            };
                            input.click();
                          }}
                          className="w-full px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          disabled={isUploading || uploadingVideoId === editingVideo.id}
                        >
                          {isUploading || uploadingVideoId === editingVideo.id ? "アップロード中..." : "動画を変更"}
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(file);
                          }}
                          className="hidden"
                          id="video-upload-edit"
                          disabled={isUploading || uploadingVideoId === editingVideo.id}
                        />
                        <label
                          htmlFor="video-upload-edit"
                          className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isUploading || uploadingVideoId === editingVideo.id
                              ? "border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed"
                              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                          }`}
                        >
                          {isUploading || uploadingVideoId === editingVideo.id ? (
                            <div className="space-y-2">
                              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto" />
                              <p className="text-sm text-gray-600">アップロード中...</p>
                            </div>
                          ) : (
                            <>
                              <VideoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-sm font-bold text-gray-700 mb-1">動画をアップロード</p>
                              <p className="text-xs text-gray-500">MP4, WebM形式 (最大50MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">サムネイル画像（オプション）</label>
                    <StudioImageUpload
                      label=""
                      type="cover"
                      currentUrl={editingVideo.thumbnail}
                      onUploadComplete={handleThumbnailUpload}
                      onUploadingChange={handleThumbnailUploadingChange}
                      onError={(error) => onError?.(error)}
                      aspectRatio="wide"
                      helperText="16:9のアスペクト比を推奨"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <StudioButton variant="outline" onClick={() => setEditingVideo(null)}>
                  キャンセル
                </StudioButton>
                <StudioButton
                  onClick={handleSaveEdit}
                  disabled={
                    !editingVideo.title || !editingVideo.video || isUploading || isSaving || isThumbnailUploading
                  }
                >
                  {isSaving || isUploading || isThumbnailUploading ? "保存中..." : "保存"}
                </StudioButton>
              </div>
            </div>
          ) : (
            /* 動画一覧 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">登録されている動画から選択してください</p>
                <StudioButton variant="outline" icon={<Plus className="w-4 h-4" />} onClick={handleAddNew}>
                  新規追加
                </StudioButton>
              </div>

              {allVideos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">動画が登録されていません</p>
                  <p className="text-xs text-gray-400 mt-1">「新規追加」ボタンから動画を追加してください</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedVideoIds.has(video.id)
                          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => handleToggleSelect(video.id)}
                    >
                      {/* 選択チェックボックス */}
                      <div className="absolute top-2 right-2 z-10">
                        {selectedVideoIds.has(video.id) ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-white/80 backdrop-blur-sm" />
                        )}
                      </div>

                      {/* サムネイル */}
                      <div className="relative w-full aspect-video bg-gray-100">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <VideoIcon className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        {/* オーバーレイ */}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                      </div>

                      {/* コンテンツ */}
                      <div className="p-3">
                        <h4 className="font-bold text-sm text-gray-700 mb-1 line-clamp-2">
                          {video.title || "タイトルなし"}
                        </h4>
                        {video.video && <p className="text-xs text-gray-500 truncate mb-2">{video.video}</p>}
                      </div>

                      {/* アクションボタン */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(video);
                          }}
                          className="p-1.5 bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-md transition-colors shadow-sm pointer-events-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(video.id);
                          }}
                          className="p-1.5 bg-white/90 backdrop-blur-sm text-red-600 hover:bg-white hover:text-red-700 rounded-md transition-colors shadow-sm pointer-events-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        {!editingVideo && (
          <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200">
            <StudioButton variant="outline" onClick={onClose}>
              キャンセル
            </StudioButton>
            <StudioButton onClick={handleApply}>適用 ({selectedVideoIds.size})</StudioButton>
          </div>
        )}
      </div>
    </div>
  );
}
