import { useState, useEffect, useCallback } from "react";
import { getCompanyProfileWithPage } from "@/lib/actions/company-profile-actions";
import { saveCompanyPage } from "@/lib/actions/company-page-actions";
import { CompanyData, dbToCompanyData, companyDataToFormDataForPage } from "@/components/company";
import type { CompanyProfileFormData } from "@/components/company/types";
import { extractSnsAccountNames, generateSnsUrls } from "@/utils/sns-url-utils";
import * as formUtils from "@/utils/form-utils";

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
  status: undefined,
  programs: [],
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
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [productionPageId, setProductionPageId] = useState<string | null>(null);
  const [productionStatus, setProductionStatus] = useState<"active" | "closed" | null>(null);
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
        // companiesテーブルとcompany_pagesテーブルからデータを取得（共通関数を使用）
        const result = await getCompanyProfileWithPage();

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
          setDraftId((result.data as any).draft_id || null);
          setDraftStatus((result.data as any).draft_status || null);
          setProductionPageId((result.data as any).production_page_id || null);
          setProductionStatus(((result.data as any).production_status as "active" | "closed" | null) || null);
          setSnsAccountNames(snsNames);
          setInitialSnsAccountNames(snsNames);
        } else {
          setCompany(emptyCompanyData);
          setCompanyId("");
          setDraftId(null);
          setDraftStatus(null);
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
      const result = await saveCompanyPage(formData);

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        // 保存後、再度データを取得して更新（共通関数を使用）
        const refreshResult = await getCompanyProfileWithPage();

        if (refreshResult.data) {
          const updatedCompanyData = dbToCompanyData(refreshResult.data);
          const snsNames = extractSnsAccountNames(updatedCompanyData.snsUrls);
          setCompany(updatedCompanyData);
          setInitialCompany(updatedCompanyData);
          setCompanyId(refreshResult.data.id);
          setDraftId((refreshResult.data as any).draft_id || null);
          setDraftStatus((refreshResult.data as any).draft_status || null);
          setProductionPageId((refreshResult.data as any).production_page_id || null);
          setProductionStatus(((refreshResult.data as any).production_status as "active" | "closed" | null) || null);
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
  const hasCompanyChanges = useCallback(() => {
    // 会社データの変更をチェック
    const companyFieldsToCompare: (keyof CompanyData)[] = [
      "description",
      "tagline",
      "logo",
      "coverImage",
      "representative",
      "established",
      "employees",
      "website",
      "addressLine1",
      "addressLine2",
      "companyInfo"
    ];

    const companyChanged = formUtils.hasFieldChanges(company, initialCompany, companyFieldsToCompare);

    // SNSアカウント名の変更をチェック
    const snsChanged =
      snsAccountNames.x !== initialSnsAccountNames.x ||
      snsAccountNames.instagram !== initialSnsAccountNames.instagram ||
      snsAccountNames.tiktok !== initialSnsAccountNames.tiktok ||
      snsAccountNames.youtube !== initialSnsAccountNames.youtube;

    // 福利厚生の変更をチェック
    const benefitsChanged = formUtils.hasObjectChanges(
      { benefits: company.benefits },
      { benefits: initialCompany.benefits }
    );

    return formUtils.hasChanges(companyChanged, snsChanged, benefitsChanged);
  }, [company, initialCompany, snsAccountNames, initialSnsAccountNames]);

  return {
    company,
    companyId,
    draftId,
    draftStatus,
    productionPageId,
    productionStatus,
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
    hasChanges: hasCompanyChanges
  };
}
