import { useState, useEffect } from "react";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/actions/company-profile-actions";
import { CompanyData, dbToCompanyData } from "@/components/company";
import type { CompanyProfileFormData } from "@/components/company/types";
import { extractSnsAccountNames, generateSnsUrls } from "@/utils/sns-url-utils";

/**
 * このページで編集可能な項目のみをフォームデータに変換
 * UIに表示されている項目のみを保存対象とする
 */
function companyDataToFormDataForPage(
  companyData: Partial<CompanyData>,
  snsUrls: CompanyData["snsUrls"]
): CompanyProfileFormData {
  return {
    // UIに表示されている項目のみ
    description: companyData.description,
    tagline: companyData.tagline,
    main_video_url: companyData.mainVideo,
    sns_x_url: snsUrls?.x,
    sns_instagram_url: snsUrls?.instagram,
    sns_tiktok_url: snsUrls?.tiktok,
    sns_youtube_url: snsUrls?.youtube,
    short_videos: companyData.shortVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
    documentary_videos: companyData.documentaryVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
    benefits: companyData.benefits?.filter((benefit) => benefit.trim() !== "")
    // 以下の項目は意図的に除外（UIに表示されていないため）
    // logo_url, industry, employees, location, address,
    // representative, capital, established, website
  };
}

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
  addressLine1: "",
  addressLine2: "",
  representative: "",
  capital: "",
  established: "",
  website: "",
  companyInfo: "",
  programs: [],
  shortVideos: [],
  documentaryVideos: [],
  benefits: [],
  jobs: [],
  events: []
};

export function useCompanyProfile() {
  const [company, setCompany] = useState<CompanyData>(emptyCompanyData);
  const [initialCompany, setInitialCompany] = useState<CompanyData>(emptyCompanyData);
  const [initialSnsAccountNames, setInitialSnsAccountNames] = useState<{
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  }>({});
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snsAccountNames, setSnsAccountNames] = useState<{
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  }>({});

  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true);
      try {
        const result = await getCompanyProfile();
        if (result.error) {
          console.error("Failed to fetch company data:", result.error);
          // 管理者や権限エラーの場合は、エラーメッセージを設定
          if (result.error.includes("管理者") || result.error.includes("権限") || result.error.includes("認証")) {
            setErrorMessage(result.error);
          }
          setCompany(emptyCompanyData);
          setCompanyId("");
        } else if (result.data) {
          const companyData = dbToCompanyData(result.data);
          const snsNames = extractSnsAccountNames(companyData.snsUrls);
          setCompany(companyData);
          setInitialCompany(companyData);
          setCompanyId(result.data.id);
          setSnsAccountNames(snsNames);
          setInitialSnsAccountNames(snsNames);
        } else {
          setCompany(emptyCompanyData);
          setCompanyId("");
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
        setCompany(emptyCompanyData);
        setCompanyId("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    try {
      const snsUrls = generateSnsUrls(snsAccountNames);
      // このページで編集可能な項目のみをフォームデータに変換
      const formData = companyDataToFormDataForPage(company, snsUrls);
      const result = await saveCompanyProfile(formData);

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        if (result.data) {
          const updatedCompanyData = dbToCompanyData(result.data);
          const snsNames = extractSnsAccountNames(updatedCompanyData.snsUrls);
          setCompany(updatedCompanyData);
          setInitialCompany(updatedCompanyData);
          setCompanyId(result.data.id);
          setSnsAccountNames(snsNames);
          setInitialSnsAccountNames(snsNames);
        }
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 変更があるかどうかを判定
  const hasChanges = () => {
    // 会社データの変更をチェック
    const companyFieldsToCompare: (keyof CompanyData)[] = [
      "description",
      "tagline",
      "mainVideo"
    ];

    const companyChanged = companyFieldsToCompare.some((field) => {
      const currentValue = company[field] || "";
      const initialValue = initialCompany[field] || "";
      return currentValue !== initialValue;
    });

    // SNSアカウント名の変更をチェック
    const snsChanged =
      snsAccountNames.x !== initialSnsAccountNames.x ||
      snsAccountNames.instagram !== initialSnsAccountNames.instagram ||
      snsAccountNames.tiktok !== initialSnsAccountNames.tiktok ||
      snsAccountNames.youtube !== initialSnsAccountNames.youtube;

    // 動画の変更をチェック
    const shortVideosChanged =
      JSON.stringify(company.shortVideos) !== JSON.stringify(initialCompany.shortVideos);
    const documentaryVideosChanged =
      JSON.stringify(company.documentaryVideos) !== JSON.stringify(initialCompany.documentaryVideos);

    // 福利厚生の変更をチェック
    const benefitsChanged = JSON.stringify(company.benefits) !== JSON.stringify(initialCompany.benefits);

    return companyChanged || snsChanged || shortVideosChanged || documentaryVideosChanged || benefitsChanged;
  };

  return {
    company,
    companyId,
    isLoading,
    isSaving,
    saveStatus,
    errorMessage,
    snsAccountNames,
    setCompany,
    setSnsAccountNames,
    handleSave,
    setErrorMessage,
    setSaveStatus,
    hasChanges
  };
}
