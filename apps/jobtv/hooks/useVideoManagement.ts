"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VideoDraft, VideoFormData, VideoCategory, VideoFilters, VideoDraftItem } from "@/types/video.types";
import {
  getVideosDraft,
  createVideoDraft,
  updateVideoDraft,
  deleteVideoPhysically,
  uploadVideoAsset
} from "@/lib/actions/video-actions";

interface UseVideoManagementOptions {
  category?: VideoCategory;
  autoLoad?: boolean;
}

/**
 * 動画管理のビジネスロジックを集約するカスタムフック
 */
export function useVideoManagement(options: UseVideoManagementOptions = {}) {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoDraftItem[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VideoFilters>({
    category: options.category
  });

  // 動画一覧を取得
  const loadVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getVideosDraft();
      if (result.error) {
        setError(result.error);
        setVideos([]);
      } else {
        setVideos(result.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "動画の読み込みに失敗しました");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...videos];

    // カテゴリーフィルター
    if (filters.category) {
      filtered = filtered.filter((v) => v.category === filters.category);
    }

    // ステータスフィルター
    if (filters.draft_status) {
      filtered = filtered.filter((v) => v.draft_status === filters.draft_status);
    }

    // 検索フィルター
    if (filters.search && filters.search.trim() !== "") {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((v) =>
        v.title.toLowerCase().includes(searchLower)
      );
    }

    setFilteredVideos(filtered);
  }, [videos, filters]);

  // 初回ロード
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadVideos();
    }
  }, [loadVideos, options.autoLoad]);

  // 動画を作成
  const createVideo = useCallback(async (formData: VideoFormData) => {
    setError(null);
    try {
      const result = await createVideoDraft(formData);
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      await loadVideos();
      return { success: true, data: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "動画の作成に失敗しました";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadVideos]);

  // 動画を更新
  const updateVideo = useCallback(async (id: string, formData: Partial<VideoFormData>) => {
    setError(null);
    try {
      const result = await updateVideoDraft(id, formData);
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      await loadVideos();
      return { success: true, data: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "動画の更新に失敗しました";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadVideos]);

  // 動画を削除
  const deleteVideo = useCallback(async (id: string) => {
    if (!window.confirm("この動画を完全に削除してもよろしいですか？この操作により、公開中の動画も削除され、元に戻すことはできません。")) {
      return { success: false, error: "キャンセルされました" };
    }

    setError(null);
    try {
      const result = await deleteVideoPhysically(id);
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      await loadVideos();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "動画の削除に失敗しました";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [loadVideos]);

  // 動画ファイルをアップロード
  const uploadVideo = useCallback(async (file: File) => {
    setError(null);
    try {
      const result = await uploadVideoAsset(file, "video");
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error, url: null };
      }
      return { success: true, url: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "動画のアップロードに失敗しました";
      setError(errorMsg);
      return { success: false, error: errorMsg, url: null };
    }
  }, []);

  // サムネイルをアップロード
  const uploadThumbnail = useCallback(async (file: File) => {
    setError(null);
    try {
      const result = await uploadVideoAsset(file, "thumbnail");
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error, url: null };
      }
      return { success: true, url: result.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "サムネイルのアップロードに失敗しました";
      setError(errorMsg);
      return { success: false, error: errorMsg, url: null };
    }
  }, []);

  // フィルターを更新
  const updateFilters = useCallback((newFilters: Partial<VideoFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // カテゴリー別の動画数を取得
  const getCountByCategory = useCallback((category: VideoCategory) => {
    return videos.filter((v) => v.category === category).length;
  }, [videos]);

  // ステータス別の動画数を取得
  const getCountByStatus = useCallback((status: string) => {
    return videos.filter((v) => v.draft_status === status).length;
  }, [videos]);

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    videos: filteredVideos,
    allVideos: videos,
    isLoading,
    error,
    filters,

    // Actions
    loadVideos,
    createVideo,
    updateVideo,
    deleteVideo,
    uploadVideo,
    uploadThumbnail,
    updateFilters,
    clearError,

    // Utilities
    getCountByCategory,
    getCountByStatus
  };
}

