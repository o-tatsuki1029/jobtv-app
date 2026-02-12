"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, MapPin, ExternalLink, Edit, Users, ImageIcon, Filter, Clock } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import FilterSortSection from "@/components/studio/molecules/FilterSortSection";
import { getJobDrafts, getJobApplicationCounts } from "@/lib/actions/job-actions";
import { useListPage } from "@/hooks/useListPage";
import type { Tables } from "@jobtv-app/shared/types";

// 型定義（DBスキーマに合わせる）
type JobPosting = Tables<"job_postings">;
type JobDraft = Tables<"job_postings_draft">;

interface Job extends Omit<JobDraft, "available_statuses" | "draft_status"> {
  available_statuses?: JobDraft["available_statuses"];
  status: "draft" | "pending" | "active" | "closed";
  entryCount: number;
}

export default function JobsPage() {
  const router = useRouter();

  const loadJobs = useCallback(async () => {
    const { data, error: fetchError } = await getJobDrafts();
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (data) {
      // エントリー数を取得（production_job_idがある場合のみ）
      const productionJobIds = data.filter((draft) => draft.production_job_id).map((draft) => draft.production_job_id!);

      const { data: counts } =
        productionJobIds.length > 0 ? await getJobApplicationCounts(productionJobIds) : { data: {} };

      const jobsWithCounts: Job[] = data.map((draft) => ({
        ...draft,
        id: draft.id,
        status:
          draft.draft_status === "submitted"
            ? "pending"
            : draft.draft_status === "approved"
            ? "active"
            : draft.draft_status === "rejected"
            ? "closed"
            : "draft",
        entryCount: draft.production_job_id ? counts?.[draft.production_job_id] || 0 : 0
      }));

      return { data: jobsWithCounts, error: null };
    }
    return { data: null, error: null };
  }, []);

  const {
    filteredItems: filteredJobs,
    loading,
    error,
    statusFilter,
    sortBy,
    setStatusFilter,
    setSortBy,
    setError
  } = useListPage<Job>({
    loadData: loadJobs,
    statusMapper: (job) => job.status,
    sortOptions: [
      { value: "updated_at_desc", label: "更新日（新しい順）" },
      { value: "updated_at_asc", label: "更新日（古い順）" },
      { value: "created_at_desc", label: "作成日（新しい順）" },
      { value: "created_at_asc", label: "作成日（古い順）" },
      { value: "title_asc", label: "タイトル（あいうえお順）" },
      { value: "title_desc", label: "タイトル（逆順）" }
    ],
    filterOptions: [
      { value: "all", label: "全て" },
      { value: "draft", label: "下書き" },
      { value: "pending", label: "審査中" },
      { value: "active", label: "公開中" },
      { value: "closed", label: "非公開" }
    ]
  });

  const handleEdit = (job: Job) => {
    router.push(`/studio/jobs/${job.id}`);
  };

  const handleCreate = () => {
    router.push("/studio/jobs/new");
  };

  // 日付フォーマット関数
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return { month: "", day: "", weekday: "", time: "" };
    const date = new Date(dateString);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return {
      month: months[date.getMonth()],
      day: date.getDate().toString(),
      weekday: weekdays[date.getDay()],
      time: `${hours}:${minutes}`
    };
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <ErrorMessage message={error || ""} />

      <PageHeader
        title="求人管理"
        description="現在募集中の求人の編集や新規作成が行えます。"
        action={
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            新規求人を作成
          </StudioButton>
        }
      />

      {/* フィルター・ソート */}
      {!loading && filteredJobs.length > 0 && (
        <FilterSortSection
          filters={[
            {
              label: "公開ステータス",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "all", label: "全て" },
                { value: "draft", label: "下書き" },
                { value: "pending", label: "審査中" },
                { value: "active", label: "公開中" },
                { value: "closed", label: "非公開" }
              ]
            },
            {
              label: "並び順",
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "updated_at_desc", label: "更新日（新しい順）" },
                { value: "updated_at_asc", label: "更新日（古い順）" },
                { value: "created_at_desc", label: "作成日（新しい順）" },
                { value: "created_at_asc", label: "作成日（古い順）" },
                { value: "title_asc", label: "タイトル（あいうえお順）" },
                { value: "title_desc", label: "タイトル（逆順）" }
              ]
            }
          ]}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filteredJobs.length === 0 && statusFilter === "all" ? (
        <EmptyState title="求人がまだ登録されていません" description="新規求人を作成して始めましょう" />
      ) : (
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <EmptyState title="条件に一致する求人がありません" />
          ) : (
            filteredJobs.map((job) => {
              // 都道府県と詳細を組み合わせて表示
              const locationText = [job.prefecture, job.location_detail]
                .filter(Boolean)
                .join(job.prefecture && job.location_detail ? " " : "");

              const createdDate = formatDate(job.created_at);

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                >
                  {/* 左側：カバー画像セクション */}
                  <div className="md:w-64 relative bg-gray-100 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden">
                    {job.cover_image_url ? (
                      <Image src={job.cover_image_url} alt={job.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 中央：詳細情報 */}
                  <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {job.employment_type && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
                            {job.employment_type}
                          </span>
                        )}
                        <StudioBadge
                          variant={
                            job.status === "active"
                              ? "success"
                              : job.status === "pending"
                              ? "neutral"
                              : job.status === "draft"
                              ? "neutral"
                              : "neutral"
                          }
                        >
                          {job.status === "active"
                            ? "公開中"
                            : job.status === "pending"
                            ? "審査中"
                            : job.status === "draft"
                            ? "下書き"
                            : "非公開"}
                        </StudioBadge>
                      </div>
                      <h3 className="text-xl font-black text-gray-900">{job.title}</h3>
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
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Users className="w-4 h-4" />
                        エントリー数: <span className="text-black font-black">{job.entryCount}</span>件
                      </div>
                    </div>
                  </div>

                  {/* 右側：アクションボタン */}
                  <div className="md:w-48 p-4 flex flex-col items-center justify-center gap-2 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                    <StudioButton size="sm" fullWidth onClick={() => router.push(`/studio/jobs/${job.id}/applicants`)}>
                      予約者管理
                    </StudioButton>
                    <StudioButton
                      variant="outline"
                      size="sm"
                      fullWidth
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => handleEdit(job)}
                    >
                      詳細編集
                    </StudioButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
