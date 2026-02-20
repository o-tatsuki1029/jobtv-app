import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

// データベーステーブル型
export type Video = Tables<"videos">;
export type VideoDraft = Tables<"videos_draft">;
export type VideoInsert = TablesInsert<"videos">;
export type VideoDraftInsert = TablesInsert<"videos_draft">;
export type VideoUpdate = TablesUpdate<"videos">;
export type VideoDraftUpdate = TablesUpdate<"videos_draft">;

// 動画カテゴリー型
export type VideoCategory = "main" | "short" | "documentary";

// 審査ステータス型
export type DraftStatus = "draft" | "submitted" | "approved" | "rejected";

// 動画アイテム表示用の型
export interface VideoItem {
  id: string;
  title: string;
  video_url: string; // 従来のMP4 URL（フォールバック用）
  streaming_url?: string | null; // HLS URL
  thumbnail_url?: string | null;
  category: VideoCategory;
  display_order: number;
  status?: "active" | "closed";
  created_at?: string;
  updated_at?: string;
}

// 変換ステータス型
export type ConversionStatus = "pending" | "processing" | "completed" | "failed";

// 動画下書き表示用の型（拡張）
export interface VideoDraftItem extends VideoItem {
  draft_status: DraftStatus;
  production_video_id?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  company_id: string;
  created_by?: string | null;
  conversion_status?: ConversionStatus | null;
  mediaconvert_job_id?: string | null;
  streaming_url?: string | null;
}

// 動画フォームデータ型
export interface VideoFormData {
  title: string;
  video_url: string;
  thumbnail_url?: string;
  category: VideoCategory;
  display_order?: number;
}

// 動画フィルター型
export interface VideoFilters {
  category?: VideoCategory;
  draft_status?: DraftStatus;
  search?: string;
}

// カテゴリー表示情報
export interface VideoCategoryInfo {
  id: VideoCategory;
  label: string;
  description: string;
  icon: string;
  maxCount?: number; // メインビデオは1つのみ
}

// カテゴリー定数
export const VIDEO_CATEGORIES: VideoCategoryInfo[] = [
  {
    id: "main",
    label: "メインビデオ",
    description: "企業ページ上部に表示されるメイン動画",
    icon: "PlaySquare",
    maxCount: 1
  },
  {
    id: "short",
    label: "ショート動画",
    description: "",
    icon: "Film",
    maxCount: 10
  },
  {
    id: "documentary",
    label: "動画",
    description: "",
    icon: "Video",
    maxCount: 10
  }
];

// ステータスバッジ用の型
export interface StatusBadgeInfo {
  label: string;
  variant: "success" | "warning" | "error" | "info" | "neutral";
}

// ステータスバッジマッピング
export const DRAFT_STATUS_BADGES: Record<DraftStatus, StatusBadgeInfo> = {
  draft: { label: "下書き", variant: "neutral" },
  submitted: { label: "審査中", variant: "info" },
  approved: { label: "承認済み", variant: "success" },
  rejected: { label: "却下", variant: "error" }
};

