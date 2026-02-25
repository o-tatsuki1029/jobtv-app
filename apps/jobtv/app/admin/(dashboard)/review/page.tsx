"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  approveJob,
  rejectJob,
  approveSession,
  rejectSession,
  approveCompanyInfo,
  rejectCompanyInfo,
  approveCompanyPage,
  rejectCompanyPage
} from "@/lib/actions/admin-actions";
import { getAllVideosDraft, approveVideo, rejectVideo } from "@/lib/actions/admin-video-actions";
import { checkAndUpdateConversionStatus } from "@/lib/actions/video-actions";
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    fields: { label: string; old: any; new: any; isChanged: boolean }[];
  } | null>(null);

  // 差分を表示
  const handleShowDiff = (item: any, type: TabType) => {
    let fields: { label: string; key: string }[] = [];
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
          { label: "カバー画像URL", key: "cover_image_url" }
        ];
        break;
      case "sessions":
        fields = [
          { label: "タイトル", key: "title" },
          { label: "形式", key: "type" },
          { label: "場所", key: "location_type" },
          { label: "詳細住所", key: "location_detail" },
          { label: "定員", key: "capacity" },
          { label: "説明会内容", key: "description" },
          { label: "カバー画像URL", key: "cover_image_url" }
        ];
        break;
      case "company-pages":
        fields = [
          { label: "タグライン", key: "tagline" },
          { label: "企業紹介文", key: "description" },
          { label: "カバー画像URL", key: "cover_image_url" },
          { label: "メイン動画URL", key: "main_video_url" },
          { label: "SNS (X)", key: "sns_x_url" },
          { label: "SNS (Instagram)", key: "sns_instagram_url" },
          { label: "SNS (TikTok)", key: "sns_tiktok_url" },
          { label: "SNS (YouTube)", key: "sns_youtube_url" },
          { label: "特典情報", key: "benefits" }
        ];
        break;
      case "videos":
        fields = [
          { label: "タイトル", key: "title" },
          { label: "カテゴリー", key: "category" },
          { label: "動画URL", key: "video_url" },
          { label: "サムネイルURL", key: "thumbnail_url" },
          { label: "表示順序", key: "display_order" }
        ];
        break;
      case "company-info":
        fields = [
          { label: "会社名", key: "name" },
          { label: "ロゴURL", key: "logo_url" },
          { label: "Webサイト", key: "website" },
          { label: "業界", key: "industry" },
          { label: "従業員数", key: "employees" },
          { label: "拠点", key: "location" },
          { label: "住所", key: "address" },
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
        isChanged: oldStr !== newStr
      };
    });

    setDiffData({
      title: item.name || item.title || "不明な項目",
      fields: diffFields
    });
    setIsDiffOpen(true);
  };

  // データを取得
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    const [jobsResult, sessionsResult, companyInfoResult, companyPagesResult, videosResult] = await Promise.all([
      getAllJobsForReview(),
      getAllSessionsForReview(),
      getAllCompanyInfoForReview(),
      getAllCompaniesForReview(),
      getAllVideosDraft({ draft_status: "submitted" })
    ]);

    if (jobsResult.error) {
      setError(jobsResult.error);
    } else if (jobsResult.data) {
      setJobs(jobsResult.data as Job[]);
    }

    if (sessionsResult.error) {
      setError(sessionsResult.error);
    } else if (sessionsResult.data) {
      setSessions(sessionsResult.data as SessionWithCompany[]);
    }

    if (companyInfoResult.error) {
      setError(companyInfoResult.error);
    } else if (companyInfoResult.data) {
      setCompanyInfo(companyInfoResult.data);
    }

    if (companyPagesResult.error) {
      setError(companyPagesResult.error);
    } else if (companyPagesResult.data) {
      setCompanyPages(companyPagesResult.data);
    }

    if (videosResult.error) {
      console.error("Videos load error:", videosResult.error);
    } else if (videosResult.data) {
      const videoList = videosResult.data;
      setVideos(videoList);
      const processingIds = videoList
        .filter(
          (v: any) =>
            v.conversion_status === "processing" || v.conversion_status === "pending"
        )
        .map((v: any) => v.id);
      if (processingIds.length > 0) {
        await Promise.all(
          processingIds.map((id: string) => checkAndUpdateConversionStatus(id))
        );
        const refreshed = await getAllVideosDraft({ draft_status: "submitted" });
        if (refreshed.data) setVideos(refreshed.data);
      }
    }

    setLoading(false);
  };

  const handleApproveJob = async (jobId: string) => {
    const result = await approveJob(jobId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleRejectJob = async (jobId: string) => {
    const result = await rejectJob(jobId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleApproveSession = async (sessionId: string) => {
    const result = await approveSession(sessionId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleRejectSession = async (sessionId: string) => {
    const result = await rejectSession(sessionId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleApproveCompanyInfo = async (draftId: string) => {
    const result = await approveCompanyInfo(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleRejectCompanyInfo = async (draftId: string) => {
    const result = await rejectCompanyInfo(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleApproveCompanyPage = async (draftId: string) => {
    const result = await approveCompanyPage(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleRejectCompanyPage = async (draftId: string) => {
    const result = await rejectCompanyPage(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleApproveVideo = async (draftId: string) => {
    const result = await approveVideo(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  const handleRejectVideo = async (draftId: string) => {
    const result = await rejectVideo(draftId);
    if (!result.error) {
      await loadAllData();
    }
    return result;
  };

  // プレビューを開く（求人）
  const handlePreviewJob = async (jobId: string) => {
    try {
      console.log("=== handlePreviewJob START ===");
      console.log("jobId:", jobId);
      console.log("jobs array length:", jobs.length);
      console.log("jobs array sample:", jobs.slice(0, 2));

      // jobIdは実際にはdraft_idまたはproduction_job_id
      // まず、jobs配列から該当するjobを取得
      const job = jobs.find((j) => j.id === jobId || (j as any).draft_id === jobId);
      console.log("Found job:", job);
      console.log("Job details:", {
        id: job?.id,
        draft_id: (job as any)?.draft_id,
        production_job_id: (job as any)?.production_job_id,
        title: job?.title
      });

      const draftId = (job as any)?.draft_id;
      const productionJobId = (job as any)?.production_job_id;

      console.log("Using draftId:", draftId, "productionJobId:", productionJobId, "jobId:", jobId);

      let draft;
      let error;

      // draft_idを優先的に使用
      if (draftId) {
        // draft_idで直接取得（管理者用）
        console.log("Trying to get draft by draftId:", draftId);
        const result = await getJobDraftById(draftId);
        draft = result.data;
        error = result.error;

        // draft_idで見つからない場合、production_job_idを試す
        if (error || !draft) {
          console.log("Draft not found by draftId, trying productionJobId:", productionJobId);
          if (productionJobId) {
            const result2 = await getJobDraftByProductionId(productionJobId);
            draft = result2.data;
            error = result2.error;
          }
        }
      } else if (productionJobId) {
        // production_job_idがある場合
        console.log("Trying to get draft by productionJobId:", productionJobId);
        const result = await getJobDraftByProductionId(productionJobId);
        draft = result.data;
        error = result.error;
      } else {
        // フォールバック: jobIdをdraft_idとして使用
        console.log("Trying to get draft by jobId (fallback):", jobId);
        const result = await getJobDraftById(jobId);
        draft = result.data;
        error = result.error;
      }

      console.log("Draft result:", {
        hasDraft: !!draft,
        draftId: draft?.id,
        error,
        errorMessage: error
      });

      if (error || !draft) {
        console.error("Get job draft error:", error);
        console.error("Error details:", { error, draft, jobId, draftId });
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
      console.log("=== handlePreviewSession START ===");
      console.log("sessionId:", sessionId);
      console.log("sessions array length:", sessions.length);
      console.log("sessions array sample:", sessions.slice(0, 2));

      // sessionIdは実際にはdraft_idまたはproduction_session_id
      // まず、sessions配列から該当するsessionを取得
      const session = sessions.find((s) => s.id === sessionId || (s as any).draft_id === sessionId);
      console.log("Found session:", session);
      console.log("Session details:", {
        id: session?.id,
        draft_id: (session as any)?.draft_id,
        production_session_id: (session as any)?.production_session_id,
        title: session?.title
      });

      const draftId = (session as any)?.draft_id;
      const productionSessionId = (session as any)?.production_session_id;

      console.log("Using draftId:", draftId, "productionSessionId:", productionSessionId, "sessionId:", sessionId);

      let draft;
      let error;

      // draft_idを優先的に使用
      if (draftId) {
        // draft_idで直接取得（管理者用）
        console.log("Trying to get draft by draftId:", draftId);
        const result = await getSessionDraftById(draftId);
        draft = result.data;
        error = result.error;

        // draft_idで見つからない場合、production_session_idを試す
        if (error || !draft) {
          console.log("Draft not found by draftId, trying productionSessionId:", productionSessionId);
          if (productionSessionId) {
            const result2 = await getSessionDraftByProductionId(productionSessionId);
            draft = result2.data;
            error = result2.error;
          }
        }
      } else if (productionSessionId) {
        // production_session_idがある場合
        console.log("Trying to get draft by productionSessionId:", productionSessionId);
        const result = await getSessionDraftByProductionId(productionSessionId);
        draft = result.data;
        error = result.error;
      } else {
        // フォールバック: sessionIdをdraft_idとして使用
        console.log("Trying to get draft by sessionId (fallback):", sessionId);
        const result = await getSessionDraftById(sessionId);
        draft = result.data;
        error = result.error;
      }

      console.log("Draft result:", {
        hasDraft: !!draft,
        draftId: draft?.id,
        error,
        errorMessage: error
      });

      if (error || !draft) {
        console.error("Get session draft error:", error);
        console.error("Error details:", { error, draft, sessionId, draftId });
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
      console.log("=== handlePreviewCompany START ===");
      console.log("companyId (should be draft_id):", companyId);
      console.log("companyPages array length:", companyPages.length);
      console.log("companyPages array:", companyPages);

      if (!companyId) {
        console.error("companyId is empty!");
        alert("ドラフトIDが指定されていません");
        return;
      }

      // companyIdは実際にはdraft_id
      console.log("Calling getCompanyPageDraftByIdAdmin with:", companyId);
      const { data: draft, error } = await getCompanyPageDraftByIdAdmin(companyId);
      console.log("getCompanyPageDraftByIdAdmin result:", {
        hasDraft: !!draft,
        draftId: draft?.id,
        error,
        errorMessage: error
      });

      if (error || !draft) {
        console.error("Get company page draft error:", error);
        console.error("Error details:", { error, draft, companyId });
        alert(`プレビューデータの取得に失敗しました: ${error || "下書きが見つかりません"}`);
        return;
      }

      // 企業情報を取得（companiesテーブルから）
      // companyIdはdraft_idなので、companyPages配列からdraft_idで検索
      const company = companyPages.find((c) => (c as any).draft_id === companyId);
      console.log("Found company by draft_id:", company);

      if (!company) {
        // draft_idで見つからない場合、company_idで検索
        const companyByCompanyId = companyPages.find((c) => c.id === draft.company_id);
        console.log("Found company by company_id:", companyByCompanyId);

        if (!companyByCompanyId) {
          console.error("Company not found. draft.company_id:", draft.company_id, "draftId:", companyId);
          alert(`企業情報が見つかりません。company_id: ${draft.company_id}`);
          return;
        }

        // companyByCompanyIdを使用
        const companyToUse = companyByCompanyId;

        setPreviewData({
          id: companyToUse.id,
          name: companyToUse.name,
          description: draft.description || companyToUse.description || "",
          logo: companyToUse.logo_url,
          coverImage: draft.cover_image_url || companyToUse.cover_image_url,
          tagline: draft.tagline || companyToUse.tagline,
          companyInfo: companyToUse.company_info,
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

  // 場所テキストを生成（説明会用）
  const getLocationText = (locationType: string | null, locationDetail: string | null) => {
    if (!locationType && !locationDetail) return null;
    if (locationType && locationDetail) {
      return `${locationType} / ${locationDetail}`;
    }
    return locationType || locationDetail || null;
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    router.push(`/admin/review?tab=${tabId}`);
  };

  const tabs = [
    { id: "company-info" as TabType, label: "企業情報", count: companyInfo.length, color: "black" as const },
    { id: "company-pages" as TabType, label: "企業ページ", count: companyPages.length, color: "red" as const },
    { id: "jobs" as TabType, label: "求人", count: jobs.length, color: "blue" as const },
    { id: "sessions" as TabType, label: "説明会", count: sessions.length, color: "green" as const },
    { id: "videos" as TabType, label: "動画", count: videos.length, color: "purple" as const }
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
            {loading ? (
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
