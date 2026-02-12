"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Users, ImageIcon, Building, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import Tabs from "@/components/studio/molecules/Tabs";
import ApprovalActions from "@/components/admin/ApprovalActions";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
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
import { getJobDraftByProductionId, getJobDraftById } from "@/lib/actions/job-actions";
import { getSessionDraftByProductionId, getSessionDraftById } from "@/lib/actions/session-actions";
import { getCompanyPageDraftById } from "@/lib/actions/company-page-actions";
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

type TabType = "company-info" | "company-pages" | "jobs" | "sessions";

export default function ReviewPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("company-pages");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [sessions, setSessions] = useState<SessionWithCompany[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company[]>([]);
  const [companyPages, setCompanyPages] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // プレビューモーダル用のstate
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("/studio/company/preview-content");

  // データを取得
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    const [jobsResult, sessionsResult, companyInfoResult, companyPagesResult] = await Promise.all([
      getAllJobsForReview(),
      getAllSessionsForReview(),
      getAllCompanyInfoForReview(),
      getAllCompaniesForReview()
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
      console.log("Calling getCompanyPageDraftById with:", companyId);
      const { data: draft, error } = await getCompanyPageDraftById(companyId);
      console.log("getCompanyPageDraftById result:", {
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
        coverImage: draft.cover_image_url || company.cover_image_url,
        tagline: draft.tagline || company.tagline,
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

  const tabs = [
    { id: "company-info" as TabType, label: "企業情報", count: companyInfo.length, color: "purple" as const },
    { id: "company-pages" as TabType, label: "企業ページ", count: companyPages.length, color: "purple" as const },
    { id: "jobs" as TabType, label: "求人", count: jobs.length, color: "blue" as const },
    { id: "sessions" as TabType, label: "説明会", count: sessions.length, color: "green" as const }
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
      <div className="space-y-10 animate-in fade-in duration-300">
        <ErrorMessage message={error || ""} />

        <div>
          <h1 className="text-3xl font-black tracking-tight">審査管理</h1>
          <p className="text-gray-500 font-medium">審査待ちの項目を承認・却下します。</p>
        </div>

        {/* タブ */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as TabType)} />

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
                        {companyInfo.map((company) => {
                          const draftId = (company as any).draft_id || company.id;
                          return (
                            <div
                              key={company.id}
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                            >
                              <div className="md:w-64 p-6 flex items-center justify-center bg-purple-50 border-b md:border-b-0 md:border-r border-purple-100">
                                {company.logo_url ? (
                                  <img
                                    src={company.logo_url}
                                    alt={company.name || ""}
                                    className="max-w-full max-h-32 object-contain"
                                  />
                                ) : (
                                  <Building className="w-16 h-16 text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded">
                                      企業情報
                                    </span>
                                    <StudioBadge variant="neutral">審査中</StudioBadge>
                                  </div>
                                  <h3 className="text-xl font-black text-gray-900 mb-2">{company.name || "未設定"}</h3>
                                  {company.company_info && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">{company.company_info}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                                  {company.website && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-black"
                                      >
                                        {company.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="md:w-64 p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                                <ApprovalActions
                                  onApprove={() => handleApproveCompanyInfo(draftId)}
                                  onReject={() => handleRejectCompanyInfo(draftId)}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                        {companyPages.map((company) => {
                          const draftId = (company as any).draft_id || company.id;
                          return (
                            <div
                              key={company.id}
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                            >
                              <div className="md:w-64 p-6 flex items-center justify-center bg-purple-50 border-b md:border-b-0 md:border-r border-purple-100">
                                {company.logo_url ? (
                                  <img
                                    src={company.logo_url}
                                    alt={company.name || ""}
                                    className="max-w-full max-h-32 object-contain"
                                  />
                                ) : (
                                  <Building className="w-16 h-16 text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded">
                                      企業ページ
                                    </span>
                                    <StudioBadge variant="neutral">審査中</StudioBadge>
                                  </div>
                                  <h3 className="text-xl font-black text-gray-900 mb-2">{company.name || "未設定"}</h3>
                                  {company.tagline && (
                                    <p className="text-sm text-gray-600 line-clamp-2">{company.tagline}</p>
                                  )}
                                  {company.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">{company.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                                  {company.website && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <a
                                        href={company.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-black"
                                      >
                                        {company.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="md:w-64 p-4 flex flex-row items-center justify-end gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                                <StudioButton
                                  variant="outline"
                                  size="sm"
                                  icon={<ExternalLink className="w-3 h-3" />}
                                  onClick={async () => {
                                    if (!draftId) {
                                      alert(`ドラフトIDが見つかりません。company.id: ${company.id}`);
                                      return;
                                    }
                                    await handlePreviewCompany(draftId);
                                  }}
                                >
                                  プレビューを見る
                                </StudioButton>
                                <ApprovalActions
                                  onApprove={() => handleApproveCompanyPage(draftId)}
                                  onReject={() => handleRejectCompanyPage(draftId)}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                        {jobs.map((job) => {
                          const locationText = [job.prefecture, job.location_detail]
                            .filter(Boolean)
                            .join(job.prefecture && job.location_detail ? " " : "");

                          return (
                            <div
                              key={job.id}
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                            >
                              <div className="md:w-64 relative bg-blue-50 border-b md:border-b-0 md:border-r border-blue-100 overflow-hidden">
                                {job.cover_image_url ? (
                                  <Image src={job.cover_image_url} alt={job.title} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-blue-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    {job.employment_type && (
                                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                                        {job.employment_type}
                                      </span>
                                    )}
                                    <StudioBadge variant="neutral">審査中</StudioBadge>
                                    {job.companies && (
                                      <span className="text-xs text-gray-500 font-medium">{job.companies.name}</span>
                                    )}
                                  </div>
                                  <h3 className="text-xl font-black text-gray-900 mb-2">{job.title}</h3>
                                  {job.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                                  {locationText && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <MapPin className="w-4 h-4" />
                                      {locationText}
                                    </div>
                                  )}
                                  {job.graduation_year && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <Users className="w-4 h-4" />
                                      {job.graduation_year}年卒
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="md:w-64 p-4 flex flex-row items-center justify-end gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                                <StudioButton
                                  variant="outline"
                                  size="sm"
                                  icon={<ExternalLink className="w-3 h-3" />}
                                  onClick={() => {
                                    const draftId = (job as any).draft_id || job.id;
                                    console.log(
                                      "Preview button clicked. draftId:",
                                      draftId,
                                      "job.id:",
                                      job.id,
                                      "full job:",
                                      job
                                    );
                                    if (!draftId) {
                                      alert("ドラフトIDが見つかりません");
                                      return;
                                    }
                                    handlePreviewJob(draftId);
                                  }}
                                >
                                  プレビューを見る
                                </StudioButton>
                                <ApprovalActions
                                  onApprove={() => handleApproveJob((job as any).draft_id || job.id)}
                                  onReject={() => handleRejectJob((job as any).draft_id || job.id)}
                                />
                              </div>
                            </div>
                          );
                        })}
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
                        {sessions.map((session) => {
                          const locationText = getLocationText(session.location_type, session.location_detail);

                          return (
                            <div
                              key={session.id}
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                            >
                              <div className="md:w-64 relative bg-green-50 border-b md:border-b-0 md:border-r border-green-100 overflow-hidden">
                                {session.cover_image_url ? (
                                  <Image
                                    src={session.cover_image_url}
                                    alt={session.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-green-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    {session.type && (
                                      <span className="text-[10px] font-black uppercase tracking-wider bg-green-600 text-white px-2 py-0.5 rounded">
                                        {session.type}
                                      </span>
                                    )}
                                    <StudioBadge variant="neutral">審査中</StudioBadge>
                                    {session.companies && (
                                      <span className="text-xs text-gray-500 font-medium">
                                        {session.companies.name}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-xl font-black text-gray-900 mb-2">{session.title}</h3>
                                  {session.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2">{session.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                                  {locationText && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <MapPin className="w-4 h-4" />
                                      {locationText}
                                    </div>
                                  )}
                                  {session.capacity && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                      <Users className="w-4 h-4" />
                                      定員: {session.capacity}名
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="md:w-64 p-4 flex flex-row items-center justify-end gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                                <StudioButton
                                  variant="outline"
                                  size="sm"
                                  icon={<ExternalLink className="w-3 h-3" />}
                                  onClick={() => {
                                    const draftId = (session as any).draft_id || session.id;
                                    console.log(
                                      "Preview button clicked. draftId:",
                                      draftId,
                                      "session.id:",
                                      session.id,
                                      "full session:",
                                      session
                                    );
                                    if (!draftId) {
                                      alert("ドラフトIDが見つかりません");
                                      return;
                                    }
                                    handlePreviewSession(draftId);
                                  }}
                                >
                                  プレビューを見る
                                </StudioButton>
                                <ApprovalActions
                                  onApprove={() => handleApproveSession((session as any).draft_id || session.id)}
                                  onReject={() => handleRejectSession((session as any).draft_id || session.id)}
                                />
                              </div>
                            </div>
                          );
                        })}
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
