import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase, Users, FileText } from "lucide-react";
import type { Tables } from "@jobtv-app/shared/types";

export async function AdminDashboardContent() {
  const supabase = await createClient();

  // 統計データを取得
  const [companiesResult, jobsResult, candidatesResult, applicationsResult] =
    await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase
        .from("job_postings")
        .select("id", { count: "exact", head: true }),
      supabase.from("candidates").select("id", { count: "exact", head: true }),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true }),
    ]);

  // 最近の応募を取得
  type RecentApplication = Tables<"applications"> & {
    candidates: {
      first_name: string;
      last_name: string;
      email: string | null;
    } | null;
    job_postings: {
      title: string;
      companies: {
        name: string;
      } | null;
    } | null;
  };

  const { data: recentApplications } = (await supabase
    .from("applications")
    .select(
      `
      id,
      applied_at,
      current_status,
      candidates (
        first_name,
        last_name,
        email
      ),
      job_postings (
        title,
        companies (
          name
        )
      )
    `,
    )
    .order("applied_at", { ascending: false })
    .limit(5)) as { data: RecentApplication[] | null };

  const stats = [
    {
      title: "登録企業数",
      value: companiesResult.count || 0,
      icon: Building2,
      description: "登録されている企業の数",
    },
    {
      title: "求人数",
      value: jobsResult.count || 0,
      icon: Briefcase,
      description: "登録されている求人の数",
    },
    {
      title: "求職者数",
      value: candidatesResult.count || 0,
      icon: Users,
      description: "登録されている求職者の数",
    },
    {
      title: "応募数",
      value: applicationsResult.count || 0,
      icon: FileText,
      description: "総応募数",
    },
  ];

  return (
    <>
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 最近の応募 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の応募</CardTitle>
        </CardHeader>
        <CardContent>
          {recentApplications && recentApplications.length > 0 ? (
            <div className="space-y-4">
              {recentApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {application.candidates
                        ? `${application.candidates.last_name} ${application.candidates.first_name}`
                        : "不明"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.job_postings?.title || "不明"} -{" "}
                      {application.job_postings?.companies?.name || "不明"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(application.applied_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {application.current_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">応募がありません</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
