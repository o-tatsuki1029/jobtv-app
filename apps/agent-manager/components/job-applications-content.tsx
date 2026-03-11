import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getApplicationStatusLabel,
  getApplicationStatusBadgeVariant,
} from "@/utils/status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@jobtv-app/shared/types";
import { getCandidateDisplayName } from "@/utils";

interface JobApplicationsContentProps {
  jobId: string;
}

export async function JobApplicationsContent({
  jobId,
}: JobApplicationsContentProps) {
  const supabase = await createClient();

  // 求人情報を取得
  const { data: job, error: jobError } = await supabase
    .from("job_postings")
    .select(
      `
      *,
      companies (
        id,
        name
      )
    `,
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    redirect("/admin/companies");
  }

  // この求人への応募を取得
  const { data: applications, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      candidates (
        id,
        phone,
        profiles!profiles_candidate_id_fkey (email, first_name, last_name)
      )
    `,
    )
    .eq("job_posting_id", jobId)
    .order("applied_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">応募者一覧</h1>
          <p className="text-muted-foreground">エラーが発生しました</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusLabel = getApplicationStatusLabel;
  const getStatusBadgeVariant = getApplicationStatusBadgeVariant;

  // ステータスごとにグループ化
  const statusOrder = [
    "applied",
    "document_screening",
    "first_interview",
    "second_interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn",
  ];

  type ApplicationRow = Tables<"applications">;
  type Candidate = Tables<"candidates">;

  interface ApplicationWithCandidate extends ApplicationRow {
    candidates: (Pick<
      Candidate,
      "id" | "phone"
    > & { profiles: { email: string | null; first_name: string; last_name: string } | null }) | null;
  }

  const groupedApplications =
    applications?.reduce(
      (
        acc: Record<string, ApplicationWithCandidate[]>,
        application: ApplicationWithCandidate,
      ) => {
        const status = application.current_status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(application);
        return acc;
      },
      {},
    ) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">応募者一覧</h1>
          <p className="text-muted-foreground">
            {job.title} - {job.companies?.name}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/admin/companies/${job.companies?.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            求人一覧に戻る
          </Link>
        </Button>
      </div>

      {applications && applications.length > 0 ? (
        <Tabs defaultValue={statusOrder[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 overflow-x-auto">
            {statusOrder.map((status) => {
              const statusApplications = groupedApplications[status] || [];
              return (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="flex items-center gap-2"
                >
                  <Badge variant={getStatusBadgeVariant(status)}>
                    {getStatusLabel(status)}
                  </Badge>
                  <span className="text-xs">({statusApplications.length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {statusOrder.map((status) => {
            const statusApplications = groupedApplications[status] || [];
            return (
              <TabsContent key={status} value={status} className="mt-4">
                {statusApplications.length > 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {statusApplications.map(
                          (application: ApplicationWithCandidate) => (
                            <div
                              key={application.id}
                              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-medium">
                                    {application.candidates
                                      ? getCandidateDisplayName(
                                          application.candidates,
                                        )
                                      : "不明"}
                                  </p>
                                </div>
                                {application.candidates?.profiles?.email && (
                                  <p className="text-sm text-muted-foreground">
                                    メール: {application.candidates.profiles.email}
                                  </p>
                                )}
                                {application.candidates?.phone && (
                                  <p className="text-sm text-muted-foreground">
                                    電話: {application.candidates.phone}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  応募日:{" "}
                                  {new Date(
                                    application.applied_at,
                                  ).toLocaleDateString("ja-JP")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link
                                    href={`/admin/candidates/${application.candidates?.id}`}
                                  >
                                    求職者詳細
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          {getStatusLabel(status)}の応募はありません
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                この求人への応募はまだありません
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
