"use client";

import React from "react";
import { Building, ExternalLink, FileSearch } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";

interface ReviewCompanyPageCardProps {
  company: any;
  onPreview: (draftId: string) => void;
  onShowDiff: (item: any) => void;
  onApprove: (draftId: string) => Promise<{ error: string | null }>;
  onReject: (draftId: string) => Promise<{ error: string | null }>;
}

export default function ReviewCompanyPageCard({
  company,
  onPreview,
  onShowDiff,
  onApprove,
  onReject
}: ReviewCompanyPageCardProps) {
  const draftId = company.draft_id || company.id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10">
      <div className="md:w-64 p-6 flex items-center justify-center bg-purple-50 border-b md:border-b-0 md:border-r border-purple-100 min-h-[160px]">
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
          {company.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">{company.description}</p>
          )}
        </div>
      </div>
      <div className="md:w-64 p-6 flex flex-col items-stretch justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
        <StudioButton
          variant="outline"
          size="sm"
          icon={<ExternalLink className="w-3 h-3" />}
          className="w-full justify-center"
          onClick={() => onPreview(draftId)}
        >
          プレビューを見る
        </StudioButton>
        <StudioButton
          variant="outline"
          size="sm"
          icon={<FileSearch className="w-3 h-3" />}
          className="w-full justify-center"
          onClick={() => onShowDiff(company)}
        >
          差分を確認
        </StudioButton>
        <ApprovalActions
          onApprove={() => onApprove(draftId)}
          onReject={() => onReject(draftId)}
          vertical
        />
      </div>
    </div>
  );
}

