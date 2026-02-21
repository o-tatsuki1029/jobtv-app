import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CompanyJobsList } from "@/components/company-jobs-list";
import Link from "next/link";
import { getCompany, getCompanyJobs } from "@/lib/actions/company-actions";

interface CompanyDetailContentProps {
  id: string;
}

export async function CompanyDetailContent({ id }: CompanyDetailContentProps) {
  // Server Actions経由でデータを取得
  const { data: company, error: companyError } = await getCompany(id);

  if (companyError || !company || !company.id) {
    redirect("/admin/companies");
  }

  // この企業の求人を取得
  const { data: jobs, error: jobsError } = await getCompanyJobs(id);

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {company.name} - 詳細
          </h1>
          <p className="text-muted-foreground">企業情報と求人を管理します</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/companies">← 一覧に戻る</Link>
        </Button>
      </div>

      {company.id && company.name && (
        <CompanyJobsList
          companyId={company.id}
          company={company}
          jobs={jobs || []}
        />
      )}
    </div>
  );
}
