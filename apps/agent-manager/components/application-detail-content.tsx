import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getApplicationStatusLabel,
  getApplicationStatusBadgeVariant,
} from "@/utils/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { ApplicationProgressSection } from "@/components/application-progress-section";
import { ApplicationStatusForm } from "@/components/application-status-form";

interface ApplicationDetailContentProps {
  id: string;
}

export async function ApplicationDetailContent({
  id,
}: ApplicationDetailContentProps) {
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      candidates (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      job_postings (
        id,
        title,
        companies (
          id,
          name
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !application) {
    redirect("/admin/applications");
  }

  // 進捗履歴を取得
  const { data: progressHistory } = await supabase
    .from("application_progress")
    .select("*")
    .eq("application_id", id)
    .order("status_date", { ascending: false })
    .order("created_at", { ascending: false });

  // 操作者情報を取得（進捗履歴がある場合）
  let progressWithUsers = progressHistory || [];
  if (progressHistory && progressHistory.length > 0) {
    const userIds = [
      ...new Set(progressHistory.map((p) => p.created_by).filter(Boolean)),
    ];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      // 進捗履歴に操作者情報をマージ
      if (profiles) {
        progressWithUsers = progressHistory.map((progress) => ({
          ...progress,
          profiles: profiles.find((p) => p.id === progress.created_by) || null,
        }));
      }
    }
  }

  const getStatusLabel = getApplicationStatusLabel;
  const getStatusBadgeVariant = getApplicationStatusBadgeVariant;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            応募詳細・進捗管理
          </h1>
          <p className="text-muted-foreground">
            応募情報の閲覧と選考進捗の管理
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/applications">← 一覧に戻る</Link>
        </Button>
      </div>

      {/* 応募基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            応募情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  求職者
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {application.candidates
                      ? `${application.candidates.last_name} ${application.candidates.first_name}`
                      : "不明"}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    asChild
                  >
                    <Link
                      href={`/admin/candidates/${application.candidates?.id}`}
                    >
                      詳細
                    </Link>
                  </Button>
                </div>
                {application.candidates?.email && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {application.candidates.email}
                  </p>
                )}
                {application.candidates?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {application.candidates.phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  求人
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {application.job_postings?.title || "不明"}
                  </p>
                </div>
                {application.job_postings?.companies && (
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {application.job_postings.companies.name}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      asChild
                    >
                      <Link
                        href={`/admin/companies/${application.job_postings.companies.id}`}
                      >
                        詳細
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  現在のステータス
                </p>
                <Badge
                  variant={getStatusBadgeVariant(application.current_status)}
                  className="mt-1"
                >
                  {getStatusLabel(application.current_status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  応募日時
                </p>
                <p className="text-sm mt-1">
                  {new Date(application.applied_at).toLocaleString("ja-JP")}
                </p>
              </div>
            </div>
            {application.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  備考
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {application.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ステータス更新フォーム */}
      <ApplicationStatusForm
        applicationId={application.id}
        currentStatus={application.current_status}
      />

      {/* 進捗履歴 */}
      <ApplicationProgressSection
        applicationId={application.id}
        progressHistory={progressWithUsers}
      />
    </div>
  );
}
