"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building, Filter, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import FilterSortSection from "@/components/studio/molecules/FilterSortSection";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { getAllCompaniesForReview, approveCompanyInfo, rejectCompanyInfo } from "@/lib/actions/admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type Company = Tables<"companies">;

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");

  // 企業一覧を取得
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllCompaniesForReview();
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    if (data) {
      setCompanies(data);
      setFilteredCompanies(data);
    }
    setLoading(false);
  };

  // ソートを適用
  useEffect(() => {
    let filtered = [...companies];

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "created_at_asc":
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
        case "created_at_desc":
        default:
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
    });

    setFilteredCompanies(filtered);
  }, [companies, sortBy]);

  const handleApprove = async (companyId: string) => {
    return approveCompanyInfo(companyId);
  };

  const handleReject = async (companyId: string) => {
    return rejectCompanyInfo(companyId);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <ErrorMessage message={error || ""} />

      <PageHeader title="企業審査" description="審査待ちの企業を承認・却下します。" />

      {/* ソート */}
      {!loading && companies.length > 0 && (
        <FilterSortSection
          filters={[
            {
              label: "並び順",
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "created_at_desc", label: "作成日（新しい順）" },
                { value: "created_at_asc", label: "作成日（古い順）" },
                { value: "name_asc", label: "企業名（あいうえお順）" },
                { value: "name_desc", label: "企業名（逆順）" }
              ]
            }
          ]}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : companies.length === 0 ? (
        <EmptyState title="審査待ちの企業はありません" />
      ) : (
        <div className="space-y-4">
          {filteredCompanies.length === 0 ? (
            <EmptyState title="条件に一致する企業がありません" />
          ) : (
            filteredCompanies.map((company) => {
              return (
                <div
                  key={company.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                >
                  {/* 左側：ロゴセクション */}
                  <div className="md:w-64 p-6 flex items-center justify-center bg-gray-100 border-b md:border-b-0 md:border-r border-gray-100">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name || ""} className="max-w-full max-h-32 object-contain" />
                    ) : (
                      <Building className="w-16 h-16 text-gray-400" />
                    )}
                  </div>

                  {/* 中央：詳細情報 */}
                  <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
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
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-black">
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右側：アクションボタン */}
                  <div className="md:w-64 p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                    <ApprovalActions
                      onApprove={() => handleApprove(company.id)}
                      onReject={() => handleReject(company.id)}
                    />
                    <StudioButton
                      variant="outline"
                      size="sm"
                      fullWidth
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => router.push(`/admin/companies/${company.id}`)}
                    >
                      詳細を見る
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

