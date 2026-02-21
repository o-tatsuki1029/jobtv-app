"use client";

import React from "react";
import Image from "next/image";
import { MapPin, Users, ImageIcon, ExternalLink, FileSearch } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";

interface ReviewJobCardProps {
  job: any;
  onPreview: (draftId: string) => void;
  onShowDiff: (item: any) => void;
  onApprove: (draftId: string) => Promise<{ error: string | null }>;
  onReject: (draftId: string) => Promise<{ error: string | null }>;
}

export default function ReviewJobCard({
  job,
  onPreview,
  onShowDiff,
  onApprove,
  onReject
}: ReviewJobCardProps) {
  const locationText = [job.prefecture, job.location_detail]
    .filter(Boolean)
    .join(job.prefecture && job.location_detail ? " " : "");

  const draftId = job.draft_id || job.id;
  const coverImage = job.cover_image_url || (job as any).company_cover_image_url;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10">
      <div className="md:w-64 relative bg-blue-50 border-b md:border-b-0 md:border-r border-blue-100 overflow-hidden min-h-[160px]">
        {coverImage ? (
          <Image src={coverImage} alt={job.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-blue-400" />
          </div>
        )}
      </div>
      <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {job.employment_type && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
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
          onClick={() => onShowDiff(job)}
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

