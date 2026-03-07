"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Users, ImageIcon, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import FilterSortSection from "@/components/studio/molecules/FilterSortSection";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { getAllJobsForReview, approveJob, rejectJob } from "@/lib/actions/admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type JobPosting = Tables<"job_postings_draft">;

interface Job extends JobPosting {
  companies?: {
    id: string;
    name: string;
  } | null;
  company_cover_image_url?: string | null;
}

const PAGE_SIZE = 20;

export default function AdminJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const [page, setPage] = useState(0);

  const loadJobs = useCallback(async (p: number, sort: string) => {
    setLoading(true);
    setError(null);
    const { data, count, error: fetchError } = await getAllJobsForReview({
      limit: PAGE_SIZE,
      offset: p * PAGE_SIZE,
      sortBy: sort
    });
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    if (data) setJobs(data as Job[]);
    setTotalCount(count ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs(page, sortBy);
  }, [page, sortBy, loadJobs]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setPage(0);
  };

  const handleApprove = async (jobId: string) => {
    return approveJob(jobId);
  };

  const handleReject = async (jobId: string) => {
    return rejectJob(jobId);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <ErrorMessage message={error || ""} />

      <PageHeader title="求人審査" description="審査待ちの求人を承認・却下します。" />

      {/* ソート */}
      {!loading && (
        <FilterSortSection
          filters={[
            {
              label: "並び順",
              value: sortBy,
              onChange: handleSortChange,
              options: [
                { value: "created_at_desc", label: "作成日（新しい順）" },
                { value: "created_at_asc", label: "作成日（古い順）" },
                { value: "title_asc", label: "タイトル（あいうえお順）" },
                { value: "title_desc", label: "タイトル（逆順）" }
              ]
            }
          ]}
        />
      )}

      {totalCount !== null && totalCount > 0 && (
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          itemCount={jobs.length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : jobs.length === 0 ? (
        <EmptyState title="審査待ちの求人はありません" />
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
                {/* 左側：カバー画像セクション */}
                <div className="md:w-64 relative bg-gray-100 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden">
                  {job.cover_image_url || job.company_cover_image_url ? (
                    <Image
                      src={job.cover_image_url || job.company_cover_image_url || ""}
                      alt={job.title}
                      fill
                      className="object-cover"
                    />
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

                {/* 右側：アクションボタン */}
                <div className="md:w-64 p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                  <ApprovalActions
                    onApprove={() => handleApprove(job.id)}
                    onReject={() => handleReject(job.id)}
                  />
                  <StudioButton
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<ExternalLink className="w-3 h-3" />}
                    onClick={() => router.push(`/admin/jobs/${job.id}`)}
                  >
                    詳細を見る
                  </StudioButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalCount !== null && totalCount > PAGE_SIZE && (
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          itemCount={jobs.length}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}
    </div>
  );
}
