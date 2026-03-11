"use client";

import React, { useState, useEffect } from "react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioSnsFields from "@/components/studio/molecules/StudioSnsFields";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import { Plus, X } from "lucide-react";
import {
  adminGetCompanyPageData,
  adminSaveCompanyPage,
  adminUploadCompanyPageCoverImage,
} from "@/lib/actions/admin-company-detail-actions";
import { extractAccountName, generateSnsUrl } from "@/utils/sns-url-utils";

interface CompanyPageTabProps {
  companyId: string;
}

const MAX_BENEFITS = 6;
const MAX_BENEFIT_LENGTH = 30;

export default function CompanyPageTab({ companyId }: CompanyPageTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [snsAccountNames, setSnsAccountNames] = useState({
    x: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await adminGetCompanyPageData(companyId);
      if (data) {
        const source = data.production || data.draft;
        if (source) {
          setTagline(source.tagline || "");
          setDescription(source.description || "");
          setCoverImageUrl(source.cover_image_url || "");
          setBenefits((source.benefits as string[]) || []);
          setSnsAccountNames({
            x: extractAccountName(source.sns_x_url || undefined, "x"),
            instagram: extractAccountName(source.sns_instagram_url || undefined, "instagram"),
            tiktok: extractAccountName(source.sns_tiktok_url || undefined, "tiktok"),
            youtube: extractAccountName(source.sns_youtube_url || undefined, "youtube"),
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await adminSaveCompanyPage(companyId, {
      tagline: tagline || null,
      description: description || null,
      cover_image_url: coverImageUrl || null,
      sns_x_url: snsAccountNames.x ? generateSnsUrl(snsAccountNames.x, "x") : null,
      sns_instagram_url: snsAccountNames.instagram ? generateSnsUrl(snsAccountNames.instagram, "instagram") : null,
      sns_tiktok_url: snsAccountNames.tiktok ? generateSnsUrl(snsAccountNames.tiktok, "tiktok") : null,
      sns_youtube_url: snsAccountNames.youtube ? generateSnsUrl(snsAccountNames.youtube, "youtube") : null,
      benefits: benefits.length > 0 ? benefits : null,
    });

    if (error) {
      setSaveError(error);
    } else {
      setSaveSuccess(true);
    }
    setSaving(false);
  };

  const handleAddBenefit = () => {
    if (benefits.length < MAX_BENEFITS) {
      setBenefits([...benefits, ""]);
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...benefits];
    newBenefits[index] = value;
    setBenefits(newBenefits);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">企業ページ</h2>
        <p className="text-sm text-gray-500 mt-1">保存すると審査をスキップして即時公開されます</p>
      </div>
      <div className="p-6 space-y-6">
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-bold text-green-800">企業ページを保存しました。</p>
          </div>
        )}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-bold text-red-800">{saveError}</p>
          </div>
        )}

        <StudioFormField
          label="キャッチコピー"
          name="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="企業のキャッチコピーを入力（32字以内）"
          maxLength={32}
          showCharCount
          disabled={saving}
        />

        <StudioFormField
          label="会社紹介文"
          name="description"
          type="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="会社の紹介文を入力（3000字以内）"
          rows={8}
          maxLength={3000}
          showCharCount
          disabled={saving}
        />

        <StudioImageUpload
          label="カバー画像"
          type="cover"
          currentUrl={coverImageUrl}
          onUploadComplete={(url) => setCoverImageUrl(url)}
          aspectRatio="wide"
          customUploadFunction={(file) => adminUploadCompanyPageCoverImage(companyId, file)}
          disabled={saving}
        />

        {/* おすすめポイント */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-gray-700">
              おすすめポイント（最大{MAX_BENEFITS}個）
            </label>
            {benefits.length < MAX_BENEFITS && (
              <StudioButton
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddBenefit}
                disabled={saving}
              >
                追加
              </StudioButton>
            )}
          </div>
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => handleBenefitChange(index, e.target.value)}
                maxLength={MAX_BENEFIT_LENGTH}
                placeholder={`ポイント${index + 1}（${MAX_BENEFIT_LENGTH}字以内）`}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/10 text-sm"
                disabled={saving}
              />
              <button
                onClick={() => handleRemoveBenefit(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* SNS */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">SNS アカウント</label>
          <StudioSnsFields
            accountNames={snsAccountNames}
            onChange={(platform, value) =>
              setSnsAccountNames((prev) => ({ ...prev, [platform]: value }))
            }
          />
        </div>

        <div className="flex justify-end">
          <StudioButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
