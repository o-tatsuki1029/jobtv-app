"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import Tabs from "@/components/studio/molecules/Tabs";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import ReviewJobCard from "@/components/admin/review/ReviewJobCard";
import ReviewSessionCard from "@/components/admin/review/ReviewSessionCard";
import ReviewCompanyInfoCard from "@/components/admin/review/ReviewCompanyInfoCard";
import ReviewCompanyPageCard from "@/components/admin/review/ReviewCompanyPageCard";
import ReviewVideoCard, { type ReviewVideo } from "@/components/admin/review/ReviewVideoCard";
import ReviewDiffModal from "@/components/admin/review/ReviewDiffModal";
import VideoPreviewModal, { type VideoPreviewModalVideo } from "@/components/VideoPreviewModal";
import {
  getAllJobsForReview,
  getAllSessionsForReview,
  getAllCompanyInfoForReview,
  getAllCompaniesForReview,
  getReviewCounts,
  approveJob,
  rejectJob,
  approveSession,
  rejectSession,
  approveCompanyInfo,
  rejectCompanyInfo,
  approveCompanyPage,
  rejectCompanyPage
} from "@/lib/actions/admin-actions";
import { getAllVideosDraft, approveVideo, rejectVideo, checkConversionStatusBatchAdmin } from "@/lib/actions/admin-video-actions";
import { getJobDraftByProductionId, getJobDraftById } from "@/lib/actions/job-actions";
import { getSessionDraftByProductionId, getSessionDraftById } from "@/lib/actions/session-actions";
import { getCompanyPageDraftByIdAdmin } from "@/lib/actions/company-page-actions";
import type { Tables } from "@jobtv-app/shared/types";

type JobPosting = Tables<"job_postings">;
type Session = Tables<"sessions">;
type Company = Tables<"companies"> & {
  draft_id?: string;
  production_page_id?: string;
  tagline?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  main_video_url?: string | null;
  sns_x_url?: string | null;
  sns_instagram_url?: string | null;
  sns_tiktok_url?: string | null;
  sns_youtube_url?: string | null;
  short_videos?: any;
  documentary_videos?: any;
  benefits?: string[] | null;
};

interface Job extends JobPosting {
  companies?: {
    id: string;
    name: string;
  } | null;
}

interface SessionWithCompany extends Session {
  companies?: {
    id: string;
    name: string;
  } | null;
}

type TabType = "company-info" | "company-pages" | "jobs" | "sessions" | "videos";
type TabLoadState = "idle" | "loading" | "loaded" | "error";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = (searchParams.get("tab") as TabType) || "company-info";
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<SessionWithCompany[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company[]>([]);
  const [companyPages, setCompanyPages] = useState<Company[]>([]);
  const [videos, setVideos] = useState<ReviewVideo[]>([]);

  // タブごとのカウント（badge 表示用）
  const [counts, setCounts] = useState<Record<TabType, number>>({
    "company-info": 0,
    "company-pages": 0,
    jobs: 0,
    sessions: 0,
    videos: 0
  });

  // タブごとの読み込み状態
  const [tabStates, setTabStates] = useState<Record<TabType, TabLoadState>>({
    "company-info": "idle",
    "company-pages": "idle",
    jobs: "idle",
    sessions: "idle",
    videos: "idle"
  });

  const [countsLoading, setCountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初回マウントフラグ
  const initializedRef = useRef(false);

  // プレビューモーダル用のstate
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("/studio/company/preview-content");

  // 動画プレビュー用のstate（モーダルで再生）
  const [previewVideo, setPreviewVideo] = useState<VideoPreviewModalVideo | null>(null);

  // 差分表示用のstate
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffData, setDiffData] = useState<{
    title: string;
    fields: { label: string; old: any; new: any; isChanged: boolean; fieldType?: "image" | "video" }[];
  } | null>(null);

  // 差分を表示
  const handleShowDiff = (item: any, type: TabType) => {
    let fields: { label: string; key: string; fieldType?: "image" | "video" }[] = [];
    const production = item.production_data || {};
    const draft = item;

    switch (type) {
      case "jobs":
        fields = [
          { label: "タイトル", key: "title" },
          { label: "雇用形態", key: "employment_type" },
          { label: "都道府県", key: "prefecture" },
          { label: "詳細住所", key: "location_detail" },
          { label: "卒業年", key: "graduation_year" },
          { label: "仕事内容", key: "description" },
          { label: "応募資格", key: "requirements" },
          { label: "福利厚生", key: "benefits" },
          { label: "選考プロセス", key: "selection_process" },
          { label: "募集ステータス", key: "available_statuses" },
          { label: "カバー画像", key: "cover_image_url", fieldType: "image" }
        ];
        break;
      case "sessions":
        fields = [
          { label: "タイトル", key: "title" },
          { label: "形式", key: "type" },
          { label: "場所", key: "location_type" },
          { label: "詳細住所", key: "location_detail" },
          { label: "定員", key: "capacity" },
          { label: "卒業年", key: "graduation_year" },
          { label: "説明会内容", key: "description" },
          { label: "カバー画像", key: "cover_image_url", fieldType: "image" }
        ];
        break;
      case "company-pages":
        fields = [
          { label: "タグライン", key: "tagline" },
          { label: "企業紹介文", key: "description" },
          { label: "カバー画像", key: "cover_image_url", fieldType: "image" },
          { label: "メイン動画", key: "main_video_url", fieldType: "video" },
          { label: "SNS (X)", key: "sns_x_url" },
          { label: "SNS (Instagram)", key: "sns_instagram_url" },
          { label: "SNS (TikTok)", key: "sns_tiktok_url" },
          { label: "SNS (YouTube)", key: "sns_youtube_url" },
          { label: "特典情報", key: "benefits" },
          { label: "ショート動画", key: "short_videos" },
          { label: "ドキュメンタリー動画", key: "documentary_videos" },
          { label: "企業動画", key: "company_videos" }
        ];
        break;
      case "videos":
        fields = [
          { label: "タイトル", key: "title" },
          { label: "カテゴリー", key: "category" },
          { label: "動画", key: "video_url", fieldType: "video" },
          { label: "サムネイル", key: "thumbnail_url", fieldType: "image" },
          { label: "自動生成サムネイル", key: "auto_thumbnail_url", fieldType: "image" },
          { label: "ストリーミングURL", key: "streaming_url", fieldType: "video" },
          { label: "表示順序", key: "display_order" }
        ];
        break;
      case "company-info":
        fields = [
          { label: "会社名", key: "name" },
          { label: "ロゴ", key: "logo_url", fieldType: "image" },
          { label: "サムネイル", key: "thumbnail_url", fieldType: "image" },
          { label: "Webサイト", key: "website" },
          { label: "業界", key: "industry" },
          { label: "従業員数", key: "employees" },
          { label: "都道府県", key: "prefecture" },
          { label: "住所1", key: "address_line1" },
          { label: "住所2", key: "address_line2" },
          { label: "代表者", key: "representative" },
          { label: "設立", key: "established" },
          { label: "企業詳細情報", key: "company_info" }
        ];
        break;
    }

    const diffFields = fields.map((f) => {
      const oldValue = production[f.key];
      const newValue = draft[f.key];

      // 文字列化して比較
      const oldStr = oldValue === null || oldValue === undefined ? "" : String(oldValue);
      const newStr = newValue === null || newValue === undefined ? "" : String(newValue);

      return {
        label: f.label,
        old: oldValue,
        new: newValue,
        isChanged: oldStr !== newStr,
        fieldType: f.fieldType
      };
    });

    setDiffData({
      title: item.name || item.title || "不明な項目",
      fields: diffFields
    });
    setIsDiffOpen(true);
  };

  // タブ単位のデータ読み込み
  const loadTabData = useCallback(async (tab: TabType) => {
    setTabStates((prev) => ({ ...prev, [tab]: "loading" }));
    setError(null);

    try {
      switch (tab) {
        case "company-info": {
          const result = await getAllCompanyInfoForReview();
          if (result.error) {
            setError(result.error);
            setTabStates((prev) => ({ ...prev, [tab]: "error" }));
          } else {
            setCompanyInfo(result.data || []);
            setCounts((prev) => ({ ...prev, [tab]: result.data?.length ?? 0 }));
            setTabStates((prev) => ({ ...prev, [tab]: "loaded" }));
          }
          break;
        }
        case "company-pages": {
          const result = await getAllCompaniesForReview();
          if (result.error) {
            setError(result.error);
            setTabStates((prev) => ({ ...prev, [tab]: "error" }));
          } else {
            setCompanyPages((result.data || []) as Company[]);
            setCounts((prev) => ({ ...prev, [tab]: result.data?.length ?? 0 }));
            setTabStates((prev) => ({ ...prev, [tab]: "loaded" }));
          }
          break;
        }
        case "jobs": {
          const result = await getAllJobsForReview();
          if (result.error) {
            setError(result.error);
            setTabStates((prev) => ({ ...prev, [tab]: "error" }));
          } else {
            setJobs((result.data || []) as Job[]);
            setCounts((prev) => ({ ...prev, [tab]: result.data?.length ?? 0 }));
            setTabStates((prev) => ({ ...prev, [tab]: "loaded" }));
          }
          break;
        }
        case "sessions": {
          const result = await getAllSessionsForReview();
          if (result.error) {
            setError(result.error);
            setTabStates((prev) => ({ ...prev, [tab]: "error" }));
          } else {
            setSessions((result.data || []) as SessionWithCompany[]);
            setCounts((prev) => ({ ...prev, [tab]: result.data?.length ?? 0 }));
            setTabStates((prev) => ({ ...prev, [tab]: "loaded" }));
          }
          break;
        }
        case "videos": {
          const result = await getAllVideosDraft({ draft_status: "submitted" });
          if (result.error) {
            console.error("Videos load error:", result.error);
            setTabStates((prev) => ({ ...prev, [tab]: "error" }));
          } else {
            let videoList = result.data || [];
            setVideos(videoList);

            // 変換中の動画を一括チェック
            const processingIds = videoList
              .filter(
                (v: any) =>
                  v.conversion_status === "processing" || v.conversion_status === "pending"
              )
              .map((v: any) => v.id);

            if (processingIds.length > 0) {
              const { updatedIds } = await checkConversionStatusBatchAdmin(processingIds);
              if (updatedIds.length > 0) {
                // 更新があった場合のみ再取得
                const refreshed = await getAllVideosDraft({ draft_status: "submitted" });
                if (refreshed.data) {
                  videoList = refreshed.data;
                  setVideos(videoList);
                }
              }
            }

            setCounts((prev) => ({ ...prev, [tab]: videoList.length }));
            setTabStates((prev) => ({ ...prev, [tab]: "loaded" }));
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Error loading tab ${tab}:`, err);
      setError("データの読み込みに失敗しました");
      setTabStates((prev) => ({ ...prev, [tab]: "error" }));
    }
  }, []);

  // 初期表示: カウント取得 + アクティブタブのデータ読み込み
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      // カウントとアクティブタブのデータを並行取得
      const [countsResult] = await Promise.all([
        getReviewCounts(),
        loadTabData(activeTab)
      ]);

      if (countsResult.data) {
        setCounts(countsResult.data);
      }
      setCountsLoading(false);
    };

    init();
  }, [activeTab, loadTabData]);

  // タブ切り替え時に未読み込みなら読み込む
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    router.push(`/admin/review?tab=${tabId}`);

    const state = tabStates[tabId];
    if (state === "idle" || state === "error") {
      loadTabData(tabId);
    }
  };

  // --- 承認/却下ハンドラー（楽観的更新） ---

  const handleApproveJob = async (jobId: string) => {
    const result = await approveJob(jobId);
    if (!result.error) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setCounts((prev) => ({ ...prev, jobs: Math.max(0, prev.jobs - 1) }));
    }
    return result;
  };

  const handleRejectJob = async (jobId: string) => {
    const result = await rejectJob(jobId);
    if (!result.error) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setCounts((prev) => ({ ...prev, jobs: Math.max(0, prev.jobs - 1) }));
    }
    return result;
  };

  const handleApproveSession = async (sessionId: string) => {
    const result = await approveSession(sessionId);
    if (!result.error) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setCounts((prev) => ({ ...prev, sessions: Math.max(0, prev.sessions - 1) }));
    }
    return result;
  };

  const handleRejectSession = async (sessionId: string) => {
    const result = await rejectSession(sessionId);
    if (!result.error) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setCounts((prev) => ({ ...prev, sessions: Math.max(0, prev.sessions - 1) }));
    }
    return result;
  };

  const handleApproveCompanyInfo = async (draftId: string) => {
    const result = await approveCompanyInfo(draftId);
    if (!result.error) {
      setCompanyInfo((prev) => prev.filter((c) => {
        const cDraftId = (c as any).draft_id;
        return cDraftId !== draftId && c.id !== draftId;
      }));
      setCounts((prev) => ({ ...prev, "company-info": Math.max(0, prev["company-info"] - 1) }));
    }
    return result;
  };

  const handleRejectCompanyInfo = async (draftId: string) => {
    const result = await rejectCompanyInfo(draftId);
    if (!result.error) {
      setCompanyInfo((prev) => prev.filter((c) => {
        const cDraftId = (c as any).draft_id;
        return cDraftId !== draftId && c.id !== draftId;
      }));
      setCounts((prev) => ({ ...prev, "company-info": Math.max(0, prev["company-info"] - 1) }));
    }
    return result;
  };

  const handleApproveCompanyPage = async (draftId: string) => {
    const result = await approveCompanyPage(draftId);
    if (!result.error) {
      setCompanyPages((prev) => prev.filter((c) => {
        const cDraftId = (c as any).draft_id;
        return cDraftId !== draftId && c.id !== draftId;
      }));
      setCounts((prev) => ({ ...prev, "company-pages": Math.max(0, prev["company-pages"] - 1) }));
    }
    return result;
  };

  const handleRejectCompanyPage = async (draftId: string) => {
    const result = await rejectCompanyPage(draftId);
    if (!result.error) {
      setCompanyPages((prev) => prev.filter((c) => {
        const cDraftId = (c as any).draft_id;
        return cDraftId !== draftId && c.id !== draftId;
      }));
      setCounts((prev) => ({ ...prev, "company-pages": Math.max(0, prev["company-pages"] - 1) }));
    }
    return result;
  };

  const handleApproveVideo = async (draftId: string) => {
    const result = await approveVideo(draftId);
    if (!result.error) {
      setVideos((prev) => prev.filter((v) => v.id !== draftId));
      setCounts((prev) => ({ ...prev, videos: Math.max(0, prev.videos - 1) }));
    }
    return result;
  };

  const handleRejectVideo = async (draftId: string) => {
    const result = await rejectVideo(draftId);
    if (!result.error) {
      setVideos((prev) => prev.filter((v) => v.id !== draftId));
      setCounts((prev) => ({ ...prev, videos: Math.max(0, prev.videos - 1) }));
    }
    return result;
  };

  // プレビューを開く（求人）
  const handlePreviewJob = async (jobId: string) => {
    try {
      const job = jobs.find((j) => j.id === jobId || (j as any).draft_id === jobId);
      const draftId = (job as any)?.draft_id;
      const productionJobId = (job as any)?.production_job_id;

      let draft;
      let error;

      if (draftId) {
        const result = await getJobDraftById(draftId);
        draft = result.data;
        error = result.error;

        if (error || !draft) {
          if (productionJobId) {
            const result2 = await getJobDraftByProductionId(productionJobId);
            draft = result2.data;
            error = result2.error;
          }
        }
      } else if (productionJobId) {
        const result = await getJobDraftByProductionId(productionJobId);
        draft = result.data;
        error = result.error;
      } else {
        const result = await getJobDraftById(jobId);
        draft = result.data;
        error = result.error;
      }

      if (error || !draft) {
        alert(`プレビューデータの取得に失敗しました: ${error || "下書きが見つかりません"}`);
        return;
      }

      const locationText = [draft.prefecture, draft.location_detail]
        .filter(Boolean)
        .join(draft.prefecture && draft.location_detail ? " " : "");

      const previewData = {
        id: draft.id || "",
        title: draft.title,
        graduationYear: `${draft.graduation_year}年卒`,
        location: locationText || "",
        status: "published" as const,
        description: draft.description || "",
        requirements: draft.requirements || "",
        benefits: draft.benefits || "",
        selectionProcess: draft.selection_process || "",
        companyName: "サンプル株式会社",
        companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
        workLocation: locationText || undefined,
        workConditions: draft.employment_type || undefined,
        coverImage: draft.cover_image_url || undefined
      };

      setPreviewData(previewData);
      setPreviewUrl("/studio/jobs/preview-content");
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert("プレビューの表示に失敗しました");
    }
  };

  // プレビューを開く（説明会）
  const handlePreviewSession = async (sessionId: string) => {
    try {
      const session = sessions.find((s) => s.id === sessionId || (s as any).draft_id === sessionId);
      const draftId = (session as any)?.draft_id;
      const productionSessionId = (session as any)?.production_session_id;

      let draft;
      let error;

      if (draftId) {
        const result = await getSessionDraftById(draftId);
        draft = result.data;
        error = result.error;

        if (error || !draft) {
          if (productionSessionId) {
            const result2 = await getSessionDraftByProductionId(productionSessionId);
            draft = result2.data;
            error = result2.error;
          }
        }
      } else if (productionSessionId) {
        const result = await getSessionDraftByProductionId(productionSessionId);
        draft = result.data;
        error = result.error;
      } else {
        const result = await getSessionDraftById(sessionId);
        draft = result.data;
        error = result.error;
      }

      if (error || !draft) {
        alert(`プレビューデータの取得に失敗しました: ${error || "下書きが見つかりません"}`);
        return;
      }

      const previewData = {
        id: draft.id || "",
        title: draft.title,
        type: draft.type,
        locationType: draft.location_type,
        locationDetail: draft.location_detail,
        description: draft.description || "",
        coverImage: draft.cover_image_url || undefined
      };

      setPreviewData(previewData);
      setPreviewUrl("/studio/sessions/preview-content");
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert("プレビューの表示に失敗しました");
    }
  };

  // プレビューを開く（企業）
  const handlePreviewCompany = async (companyId: string) => {
    try {
      if (!companyId) {
        alert("ドラフトIDが指定されていません");
        return;
      }

      const { data: draft, error } = await getCompanyPageDraftByIdAdmin(companyId);

      if (error || !draft) {
        alert(`プレビューデータの取得に失敗しました: ${error || "下書きが見つかりません"}`);
        return;
      }

      const company = companyPages.find((c) => (c as any).draft_id === companyId);

      if (!company) {
        const companyByCompanyId = companyPages.find((c) => c.id === draft.company_id);

        if (!companyByCompanyId) {
          alert(`企業情報が見つかりません。company_id: ${draft.company_id}`);
          return;
        }

        setPreviewData({
          id: companyByCompanyId.id,
          name: companyByCompanyId.name,
          description: draft.description || companyByCompanyId.description || "",
          logo: companyByCompanyId.logo_url,
          coverImage: draft.cover_image_url || companyByCompanyId.cover_image_url,
          tagline: draft.tagline || companyByCompanyId.tagline,
          companyInfo: companyByCompanyId.company_info,
          mainVideo: draft.main_video_url,
          snsUrls: {
            x: draft.sns_x_url,
            instagram: draft.sns_instagram_url,
            tiktok: draft.sns_tiktok_url,
            youtube: draft.sns_youtube_url
          },
          shortVideos: draft.short_videos || [],
          documentaryVideos: draft.documentary_videos || [],
          benefits: draft.benefits || []
        });
        setPreviewUrl("/studio/company/preview-content");
        setIsPreviewOpen(true);
        return;
      }

      setPreviewData({
        id: company.id,
        name: company.name,
        description: draft.description || company.description || "",
        logo: company.logo_url,
        coverImage: draft.cover_image_url,
        tagline: draft.tagline,
        companyInfo: company.company_info,
        mainVideo: draft.main_video_url,
        snsUrls: {
          x: draft.sns_x_url,
          instagram: draft.sns_instagram_url,
          tiktok: draft.sns_tiktok_url,
          youtube: draft.sns_youtube_url
        },
        shortVideos: draft.short_videos || [],
        documentaryVideos: draft.documentary_videos || [],
        benefits: draft.benefits || []
      });
      setPreviewUrl("/studio/company/preview-content");
      setIsPreviewOpen(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert("プレビューの表示に失敗しました");
    }
  };

  const isTabLoading = tabStates[activeTab] === "loading" || tabStates[activeTab] === "idle";

  const tabs = [
    { id: "company-info" as TabType, label: "企業情報", count: counts["company-info"], color: "black" as const },
    { id: "company-pages" as TabType, label: "企業ページ", count: counts["company-pages"], color: "red" as const },
    { id: "jobs" as TabType, label: "求人", count: counts.jobs, color: "blue" as const },
    { id: "sessions" as TabType, label: "説明会", count: counts.sessions, color: "green" as const },
    { id: "videos" as TabType, label: "動画", count: counts.videos, color: "purple" as const }
  ];

  return (
    <>
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={previewData}
        previewUrl={previewUrl}
      />

      {/* 差分表示モーダル */}
      <ReviewDiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        title={diffData?.title || ""}
        fields={diffData?.fields || []}
      />

      {/* 動画プレビューモーダル */}
      {previewVideo && (
        <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}

      <div className="space-y-10 animate-in fade-in duration-300">
        <ErrorMessage message={error || ""} />

        <div>
          <h1 className="text-3xl font-black tracking-tight">審査管理</h1>
          <p className="text-gray-500 font-medium">審査待ちの項目を承認・却下します。</p>
        </div>

        {/* タブ */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => handleTabChange(tabId as TabType)} />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            {isTabLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {/* 企業情報タブ */}
                {activeTab === "company-info" && (
                  <>
                    {companyInfo.length === 0 ? (
                      <EmptyState title="審査待ちの企業情報はありません" />
                    ) : (
                      <div className="space-y-4">
                        {companyInfo.map((company) => (
                          <ReviewCompanyInfoCard
                            key={company.id}
                            company={company}
                            onShowDiff={(item) => handleShowDiff(item, "company-info")}
                            onApprove={handleApproveCompanyInfo}
                            onReject={handleRejectCompanyInfo}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 企業ページタブ */}
                {activeTab === "company-pages" && (
                  <>
                    {companyPages.length === 0 ? (
                      <EmptyState title="審査待ちの企業ページはありません" />
                    ) : (
                      <div className="space-y-4">
                        {companyPages.map((company) => (
                          <ReviewCompanyPageCard
                            key={company.id}
                            company={company}
                            onPreview={handlePreviewCompany}
                            onShowDiff={(item) => handleShowDiff(item, "company-pages")}
                            onApprove={handleApproveCompanyPage}
                            onReject={handleRejectCompanyPage}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 求人タブ */}
                {activeTab === "jobs" && (
                  <>
                    {jobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-gray-500 font-medium">審査待ちの求人はありません</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs.map((job) => (
                          <ReviewJobCard
                            key={job.id}
                            job={job}
                            onPreview={handlePreviewJob}
                            onShowDiff={(item) => handleShowDiff(item, "jobs")}
                            onApprove={handleApproveJob}
                            onReject={handleRejectJob}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 説明会タブ */}
                {activeTab === "sessions" && (
                  <>
                    {sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-gray-500 font-medium">審査待ちの説明会はありません</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sessions.map((session) => (
                          <ReviewSessionCard
                            key={session.id}
                            session={session}
                            onPreview={handlePreviewSession}
                            onShowDiff={(item) => handleShowDiff(item, "sessions")}
                            onApprove={handleApproveSession}
                            onReject={handleRejectSession}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 動画タブ */}
                {activeTab === "videos" && (
                  <>
                    {videos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-gray-500 font-medium">審査待ちの動画はありません</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {videos.map((video) => (
                          <ReviewVideoCard
                            key={video.id}
                            video={video}
                            onApprove={handleApproveVideo}
                            onReject={handleRejectVideo}
                            onPreview={setPreviewVideo}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
