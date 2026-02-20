import { getJob } from "@/lib/actions/job-actions";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { approveJob, rejectJob } from "@/lib/actions/admin-actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";

type JobPosting = Tables<"job_postings">;

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getJobWithCompany(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select(
      `
      *,
      companies (
        id,
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Get job with company error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export default async function AdminJobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const { data: job, error } = await getJobWithCompany(id);

  if (error || !job) {
    redirect("/admin/jobs");
  }

  const jobData = job as JobPosting & {
    companies?: {
      id: string;
      name: string;
    } | null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/jobs">
            <StudioButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </StudioButton>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{jobData.title}</h1>
            <p className="text-muted-foreground">求人情報の審査</p>
          </div>
        </div>
        {/* 審査中の判定はドラフトテーブルのdraft_statusを参照 */}
        {/* このページは本番テーブルから取得しているため、審査機能は別ページで実装 */}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StudioBadge variant={jobData.status === "active" ? "success" : "neutral"}>
              {jobData.status === "active" ? "公開中" : "非公開"}
            </StudioBadge>
            {jobData.companies && (
              <span className="text-sm text-gray-600 font-medium">企業: {jobData.companies.name}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">雇用形態</p>
            <p className="text-base">{jobData.employment_type || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">卒業年</p>
            <p className="text-base">{jobData.graduation_year ? `${jobData.graduation_year}年卒` : "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">勤務地/都道府県</p>
            <p className="text-base">{jobData.prefecture || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">勤務地/詳細</p>
            <p className="text-base">{jobData.location_detail || "未設定"}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">職務内容</p>
          <p className="text-base whitespace-pre-wrap">{jobData.description || "未設定"}</p>
        </div>

        {jobData.requirements && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">応募資格</p>
            <p className="text-base whitespace-pre-wrap">{jobData.requirements}</p>
          </div>
        )}

        {jobData.benefits && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">福利厚生</p>
            <p className="text-base whitespace-pre-wrap">{jobData.benefits}</p>
          </div>
        )}

        {jobData.selection_process && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">選考プロセス</p>
            <p className="text-base whitespace-pre-wrap">{jobData.selection_process}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">作成日</p>
            <p className="text-base">
              {new Date(jobData.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">更新日</p>
            <p className="text-base">
              {new Date(jobData.updated_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

