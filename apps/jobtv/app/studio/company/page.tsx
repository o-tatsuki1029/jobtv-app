"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Building,
  Image as ImageIcon,
  Save,
  Eye,
  Globe,
  Loader2,
  CheckCircle2,
  Video,
  Plus,
  Trash2,
  Gift
} from "lucide-react";
import { CompanyData, dbToCompanyData } from "@/components/company";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioPreviewModal from "@/components/studio/organisms/StudioPreviewModal";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioVideoList from "@/components/studio/molecules/StudioVideoList";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/actions/company-profile-actions";
import { useParams } from "next/navigation";

// 空の初期データ
const emptyCompanyData: CompanyData = {
  id: "",
  name: "",
  description: "",
  logo: "",
  coverImage: "",
  industry: "",
  employees: "",
  location: "",
  address: "",
  representative: "",
  capital: "",
  established: "",
  website: "",
  programs: [],
  shortVideos: [],
  documentaryVideos: [],
  benefits: [],
  jobs: [],
  events: []
};

export default function CompanyPageManagement() {
  const params = useParams();
  const urlCompanyId = (params?.id as string) || "uid"; // URLパラメータから取得

  const [company, setCompany] = useState<CompanyData>(emptyCompanyData);
  const [companyId, setCompanyId] = useState<string>("uid"); // 実際の企業IDを保持
  const [hasInitialized, setHasInitialized] = useState(false); // 初回読み込み完了フラグ
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // SNSアカウント名を管理（URLではなくアカウント名のみ）
  const [snsAccountNames, setSnsAccountNames] = useState<{
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  }>({});

  // URLからアカウント名を抽出
  const extractAccountName = (url: string | undefined, platform: "x" | "instagram" | "tiktok" | "youtube"): string => {
    if (!url) return "";
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      switch (platform) {
        case "x":
          // https://x.com/account または https://twitter.com/account
          return pathname.replace(/^\//, "").split("/")[0] || "";
        case "instagram":
          // https://instagram.com/account または https://www.instagram.com/account/
          return pathname.replace(/^\//, "").split("/")[0] || "";
        case "tiktok":
          // https://tiktok.com/@account
          const match = pathname.match(/@([^/]+)/);
          return match ? match[1] : pathname.replace(/^\//, "").replace(/^@/, "") || "";
        case "youtube":
          // https://youtube.com/@account または https://youtube.com/c/account
          if (pathname.startsWith("/@")) {
            return pathname.replace(/^\/@/, "").split("/")[0] || "";
          } else if (pathname.startsWith("/c/")) {
            return pathname.replace(/^\/c\//, "").split("/")[0] || "";
          }
          return "";
        default:
          return "";
      }
    } catch {
      // URLとして解析できない場合は、そのまま返す（既にアカウント名の可能性）
      return url;
    }
  };

  // アカウント名からURLを生成
  const generateSnsUrl = (accountName: string, platform: "x" | "instagram" | "tiktok" | "youtube"): string => {
    if (!accountName.trim()) return "";
    const cleanName = accountName
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\//, "");

    switch (platform) {
      case "x":
        return `https://x.com/${cleanName}`;
      case "instagram":
        return `https://instagram.com/${cleanName}`;
      case "tiktok":
        return `https://tiktok.com/@${cleanName}`;
      case "youtube":
        return `https://youtube.com/@${cleanName}`;
      default:
        return "";
    }
  };

  // 初期データを取得（初回のみ、またはurlCompanyIdが変更された場合のみ）
  useEffect(() => {
    // 既に初期化済みで、urlCompanyIdが変更されていない場合はスキップ
    if (hasInitialized && companyId && companyId !== "uid" && company.id) {
      return;
    }

    const fetchCompanyData = async () => {
      setIsLoading(true);

      try {
        // companyIdが"uid"の場合は、最初の企業を取得
        const targetId = urlCompanyId === "uid" ? "" : urlCompanyId;
        const result = await getCompanyProfile(targetId || "uid");

        if (result.error) {
          console.error("Failed to fetch company data:", result.error);
          // エラー時は既存のデータを保持（初回読み込みでない限り上書きしない）
          if (!hasInitialized) {
            setCompany(emptyCompanyData);
            setCompanyId("");
            setHasInitialized(true);
          }
        } else if (result.data) {
          // データベースから取得したデータを変換
          console.log("Fetched company data:", result.data);
          const companyData = dbToCompanyData(result.data);
          console.log("Converted company data:", companyData);
          setCompany(companyData);
          // 実際の企業IDを設定
          setCompanyId(result.data.id);
          // SNS URLからアカウント名を抽出
          setSnsAccountNames({
            x: extractAccountName(companyData.snsUrls?.x, "x"),
            instagram: extractAccountName(companyData.snsUrls?.instagram, "instagram"),
            tiktok: extractAccountName(companyData.snsUrls?.tiktok, "tiktok"),
            youtube: extractAccountName(companyData.snsUrls?.youtube, "youtube")
          });
          setHasInitialized(true);
        } else {
          // データがない場合は既存のデータを保持（初回読み込みでない限り上書きしない）
          if (!hasInitialized) {
            setCompany(emptyCompanyData);
            setCompanyId("");
            setHasInitialized(true);
          }
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        // エラー時も既存のデータを保持
        if (!hasInitialized) {
          setHasInitialized(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCompanyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      // snsUrlsの場合は特別処理
      if (parent === "snsUrls") {
        setCompany((prev) => ({
          ...prev,
          snsUrls: {
            ...prev.snsUrls,
            [child]: value
          }
        }));
      } else {
        setCompany((prev) => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof CompanyData] as any),
            [child]: value
          }
        }));
      }
    } else {
      setCompany((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    try {
      const formData = {
        description: company.description,
        tagline: company.tagline,
        cover_image_url: company.coverImage,
        main_video_url: company.mainVideo,
        industry: company.industry,
        location: company.location,
        address: company.address,
        sns_x_url: generateSnsUrl(snsAccountNames.x || "", "x"),
        sns_instagram_url: generateSnsUrl(snsAccountNames.instagram || "", "instagram"),
        sns_tiktok_url: generateSnsUrl(snsAccountNames.tiktok || "", "tiktok"),
        sns_youtube_url: generateSnsUrl(snsAccountNames.youtube || "", "youtube"),
        short_videos: company.shortVideos.map((v) => ({
          id: v.id,
          title: v.title,
          video_url: v.video,
          thumbnail_url: v.thumbnail
        })),
        documentary_videos: company.documentaryVideos?.map((v) => ({
          id: v.id,
          title: v.title,
          video_url: v.video,
          thumbnail_url: v.thumbnail
        })),
        benefits: (company.benefits || []).filter((benefit) => benefit.trim() !== "")
      };

      const result = await saveCompanyProfile(companyId, formData);

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        // 保存成功後、データを再取得して最新の状態を反映
        if (result.data) {
          const companyData = dbToCompanyData(result.data);
          setCompany(companyData);
          setCompanyId(result.data.id);
          // SNS URLからアカウント名を抽出
          setSnsAccountNames({
            x: extractAccountName(companyData.snsUrls?.x, "x"),
            instagram: extractAccountName(companyData.snsUrls?.instagram, "instagram"),
            tiktok: extractAccountName(companyData.snsUrls?.tiktok, "tiktok"),
            youtube: extractAccountName(companyData.snsUrls?.youtube, "youtube")
          });
        }
        // 3秒後に成功メッセージを消す
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (field: "coverImage", url: string) => {
    setCompany((prev) => ({ ...prev, [field]: url }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* プレビューモーダル */}
      <StudioPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        device={previewDevice}
        setDevice={setPreviewDevice}
        companyData={company}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">企業ページ管理</h1>
          <p className="text-gray-500 font-medium">求職者に表示される企業プロフィールの編集と公開設定を行います。</p>
        </div>
        <div className="flex gap-2">
          <StudioButton variant="outline" icon={<Eye className="w-4 h-4" />} onClick={() => setIsPreviewOpen(true)}>
            プレビュー
          </StudioButton>
          <StudioButton
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "変更を保存"}
          </StudioButton>
        </div>
      </div>

      {/* 保存ステータス表示 */}
      {saveStatus === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-bold text-green-800">保存が完了しました</p>
        </div>
      )}

      {saveStatus === "error" && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold">×</span>
          <p className="text-sm font-bold text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* コンテンツ情報 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">コンテンツ情報</h2>
            </div>
            <div className="p-8 space-y-6">
              <StudioFormField
                label="キャッチコピー"
                name="tagline"
                value={company.tagline || ""}
                onChange={handleChange}
                placeholder="求職者の心を掴むキャッチコピーを入力"
              />
              <StudioFormField
                label="会社紹介文"
                name="description"
                type="textarea"
                value={company.description}
                onChange={handleChange}
                rows={12}
                placeholder="会社紹介文を入力(3000字以内)"
                helperText={`${company.description.length} / 3000 文字`}
              />
            </div>
          </div>

          {/* 動画管理 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Video className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">動画管理</h2>
            </div>
            <div className="p-8 space-y-8">
              <StudioVideoList
                label="メインビデオ"
                companyId={companyId}
                videos={company.mainVideo ? [{ id: "main", title: "メインビデオ", video: company.mainVideo }] : []}
                onChange={(videos) => {
                  setCompany((prev) => ({ ...prev, mainVideo: videos[0]?.video || undefined }));
                }}
                onError={(error) => {
                  setErrorMessage(error);
                  setSaveStatus("error");
                }}
              />
              <p className="text-[10px] text-gray-400 -mt-4">
                企業ページ上部に表示されるメイン動画です。MP4, WebM形式 (最大50MB)。
              </p>
              <div className="pt-4 border-t border-gray-100">
                <StudioVideoList
                  label="ショート動画"
                  companyId={companyId}
                  videos={company.shortVideos}
                  onChange={(videos) => setCompany((prev) => ({ ...prev, shortVideos: videos }))}
                  onError={(error) => {
                    setErrorMessage(error);
                    setSaveStatus("error");
                  }}
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <StudioVideoList
                  label="動画"
                  companyId={companyId}
                  videos={company.documentaryVideos || []}
                  onChange={(videos) => setCompany((prev) => ({ ...prev, documentaryVideos: videos }))}
                  onError={(error) => {
                    setErrorMessage(error);
                    setSaveStatus("error");
                  }}
                />
              </div>
            </div>
          </div>

          {/* 福利厚生・制度 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Gift className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">福利厚生・制度</h2>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-end">
                <StudioButton
                  variant="outline"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    if ((company.benefits || []).length >= 6) {
                      setErrorMessage("福利厚生・制度は最大6個まで登録できます");
                      setSaveStatus("error");
                      return;
                    }
                    setCompany((prev) => ({
                      ...prev,
                      benefits: [...(prev.benefits || []), ""]
                    }));
                  }}
                  className="text-xs"
                  disabled={(company.benefits || []).length >= 6}
                >
                  項目を追加
                </StudioButton>
              </div>
              {(company.benefits || []).length >= 6 && (
                <p className="text-[10px] text-gray-400">福利厚生・制度は最大6個まで登録できます</p>
              )}
              {company.benefits && company.benefits.length > 0 ? (
                <div className="space-y-3">
                  {company.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <StudioFormField
                          label={`福利厚生・制度を入力(${index + 1}/6)`}
                          name={`benefit-${index}`}
                          value={benefit}
                          onChange={(e) => {
                            const newBenefits = [...company.benefits];
                            newBenefits[index] = e.target.value;
                            setCompany((prev) => ({
                              ...prev,
                              benefits: newBenefits
                            }));
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newBenefits = company.benefits.filter((_, i) => i !== index);
                          setCompany((prev) => ({
                            ...prev,
                            benefits: newBenefits
                          }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                        aria-label="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">福利厚生項目が登録されていません</p>
                  <p className="text-xs text-gray-400 mt-1">「項目を追加」ボタンから福利厚生を追加してください</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* ビジュアル管理 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">ビジュアル</h2>
            </div>
            <div className="p-6 space-y-8">
              <StudioImageUpload
                label="カバー画像"
                companyId={companyId}
                type="cover"
                currentUrl={company.coverImage}
                onUploadComplete={(url) => handleImageUpload("coverImage", url)}
                onError={(error) => {
                  setErrorMessage(error);
                  setSaveStatus("error");
                }}
                aspectRatio="wide"
                helperText="1200x400px 以上を推奨"
              />
            </div>
          </div>

          {/* 外部リンク */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">外部リンク</h2>
            </div>
            <div className="p-6 space-y-4">
              <StudioLabel className="mb-4">SNSアカウント</StudioLabel>
              <div className="space-y-3">
                <StudioFormField
                  label="X (Twitter)"
                  name="snsAccountNames.x"
                  value={snsAccountNames.x || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSnsAccountNames((prev) => ({
                      ...prev,
                      x: value
                    }));
                  }}
                  placeholder="アカウント名（例: company_name）"
                />
                <StudioFormField
                  label="Instagram"
                  name="snsAccountNames.instagram"
                  value={snsAccountNames.instagram || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSnsAccountNames((prev) => ({
                      ...prev,
                      instagram: value
                    }));
                  }}
                  placeholder="アカウント名（例: company_name）"
                />
                <StudioFormField
                  label="TikTok"
                  name="snsAccountNames.tiktok"
                  value={snsAccountNames.tiktok || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSnsAccountNames((prev) => ({
                      ...prev,
                      tiktok: value
                    }));
                  }}
                  placeholder="アカウント名（例: company_name）"
                />
                <StudioFormField
                  label="YouTube"
                  name="snsAccountNames.youtube"
                  value={snsAccountNames.youtube || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSnsAccountNames((prev) => ({
                      ...prev,
                      youtube: value
                    }));
                  }}
                  placeholder="アカウント名（例: company_name）"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                アカウント名が設定されていないSNSアイコンは非表示になります
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
