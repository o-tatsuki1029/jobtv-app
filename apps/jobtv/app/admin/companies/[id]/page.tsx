import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { approveCompanyInfo, rejectCompanyInfo } from "@/lib/actions/admin-actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";
import { Building } from "lucide-react";

type Company = Tables<"companies">;

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getCompanyById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();

  if (error) {
    console.error("Get company error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export default async function AdminCompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params;
  const { data: company, error } = await getCompanyById(id);

  if (error || !company) {
    redirect("/admin/companies");
  }

  const companyData = company as Company;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/companies">
            <StudioButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </StudioButton>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{companyData.name || "未設定"}</h1>
            <p className="text-muted-foreground">企業情報の審査</p>
          </div>
        </div>
        {/* 審査中の判定はドラフトテーブルのdraft_statusを参照 */}
        {/* このページは本番テーブルから取得しているため、審査機能は別ページで実装 */}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StudioBadge variant={companyData.status === "active" ? "success" : "neutral"}>
              {companyData.status === "active" ? "公開中" : "非公開"}
            </StudioBadge>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
          {companyData.logo_url ? (
            <img src={companyData.logo_url} alt={companyData.name || ""} className="max-w-full max-h-48 object-contain" />
          ) : (
            <Building className="w-24 h-24 text-gray-400" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">企業名</p>
            <p className="text-base">{companyData.name || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">業界</p>
            <p className="text-base">{companyData.industry || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">ウェブサイト</p>
            <p className="text-base">
              {companyData.website ? (
                <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {companyData.website}
                </a>
              ) : (
                "未設定"
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">住所</p>
            <p className="text-base">
              {companyData.address_line1 || ""} {companyData.address_line2 || ""}
              {!companyData.address_line1 && !companyData.address_line2 && "未設定"}
            </p>
          </div>
          {companyData.established && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">設立年</p>
              <p className="text-base">{companyData.established}</p>
            </div>
          )}
          {companyData.employees && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">従業員数</p>
              <p className="text-base">{companyData.employees}</p>
            </div>
          )}
          {companyData.representative && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">代表者</p>
              <p className="text-base">{companyData.representative}</p>
            </div>
          )}
        </div>

        {companyData.company_info && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">企業情報</p>
            <p className="text-base whitespace-pre-wrap">{companyData.company_info}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">作成日</p>
            <p className="text-base">
              {new Date(companyData.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">更新日</p>
            <p className="text-base">
              {new Date(companyData.updated_at).toLocaleDateString("ja-JP", {
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

