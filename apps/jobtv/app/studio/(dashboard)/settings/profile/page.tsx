"use client";

import React, { useState, useEffect } from "react";
import { Building, Loader2 } from "lucide-react";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import { getCompanyProfile, uploadCompanyAsset } from "@/lib/actions/company-profile-actions";
import { saveCompanyInfo, getCompanyInfoDraft, submitCompanyInfoForReview } from "@/lib/actions/company-info-actions";
import { dbToCompanyData } from "@/components/company";
import type { CompanyData } from "@/components/company";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { validateRequired, validateMaxLength, validateUrlWithProtocol } from "@jobtv-app/shared/utils/validation";
import { REPRESENTATIVE_NAME_MAX_LENGTH, COMPANY_INFO_MAX_LENGTH } from "@/constants/validation";
import { useStudioEditor } from "@/hooks/useStudioEditor";
import DraftActionButtons from "@/components/studio/molecules/DraftActionButtons";
import StudioEditorAlerts from "@/components/studio/molecules/StudioEditorAlerts";
import StudioEditorStatusSection from "@/components/studio/molecules/StudioEditorStatusSection";
import {
  generateIndustryOptions,
  generateYearOptions,
  generateMonthOptions,
  generateEmployeesRangeOptions
} from "@/constants/company-options";

// 空の初期データ
const emptyCompanyData: Partial<CompanyData> = {
  id: "",
  name: "",
  logo: "",
  representative: "",
  established: "",
  employees: "",
  website: "",
  prefecture: "",
  addressLine1: "",
  addressLine2: "",
  companyInfo: ""
};

export default function ProfileSettingsPage() {
  // 企業プロフィール用のstate
  const [company, setCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialCompany, setInitialCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialEmployeesRange, setInitialEmployeesRange] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    logo?: string;
    industry?: string;
    representative?: string;
    established?: string;
    employees?: string;
    website?: string;
    prefecture?: string;
    addressLine1?: string;
    addressLine2?: string;
    companyInfo?: string;
  }>({});
  const [establishedYear, setEstablishedYear] = useState<string>("");
  const [establishedMonth, setEstablishedMonth] = useState<string>("");
  const [employeesRange, setEmployeesRange] = useState<string>("");

  // 設立年月をパースする関数
  const parseEstablishedDate = (dateString: string): { year: string; month: string } | null => {
    if (!dateString) return null;
    const pattern1 = /^(\d{4})年(\d{1,2})月?$/;
    const match1 = dateString.match(pattern1);
    if (match1) {
      return { year: match1[1], month: match1[2].padStart(2, "0") };
    }
    const pattern2 = /^(\d{4})[-/.](\d{1,2})$/;
    const match2 = dateString.match(pattern2);
    if (match2) {
      return { year: match2[1], month: match2[2].padStart(2, "0") };
    }
    return null;
  };

  // 年と月から設立年月文字列を生成
  const formatEstablishedDate = (year: string, month: string): string => {
    if (!year || !month) return "";
    return `${year}年${parseInt(month, 10)}月`;
  };

  // 年のオプションを生成（現在から1800年まで）

  // ドラフトIDを管理
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"draft" | "submitted" | "approved" | "rejected" | null>(null);
  const [productionStatus, setProductionStatus] = useState<"active" | "closed" | null>(null);

  // 共通スタジオエディターフック
  const {
    isReadOnly,
    showUnderReviewAlert,
    showOlderVersionAlert,
    submitForReview,
    isSubmittingReview,
    error: studioError,
    setSaving: setStudioSaving,
    saving: isStudioSaving
  } = useStudioEditor({
    type: "company_info",
    id: companyId || "new",
    data: companyId
      ? {
          id: companyId,
          draft_status: draftStatus || undefined,
          production_status: productionStatus || undefined,
          production_id: companyId
        }
      : null,
    onSave: async () => {
      const result = await handleSave();
      if (result && result.error) {
        return { error: result.error };
      }
      return { error: null, draftId: result?.draftId };
    },
    onSubmit: async (id) => {
      return await submitCompanyInfoForReview(id);
    },
    onToggleStatus: async () => {
      return { data: null, error: null };
    },
    validate: () => {
      if (hasValidationErrors()) {
        return "入力内容を確認してください";
      }
      if (!company.logo) return "ロゴは必須です";
      if (!company.industry) return "業界は必須です";
      if (!company.representative) return "代表者名は必須です";
      if (!establishedYear || !establishedMonth) return "設立年月は必須です";
      if (!employeesRange) return "従業員数は必須です";
      if (!company.prefecture) return "都道府県は必須です";
      if (!company.addressLine1) return "市区町村・番地は必須です";
      if (!company.website) return "公式サイトは必須です";
      if (!company.companyInfo) return "企業情報は必須です";
      return null;
    },
    onSuccess: async () => {
      // データを再取得
      const result = await getCompanyInfoDraft();
      if (result.data) {
        setCurrentDraftId(result.data.id);
        setDraftStatus(result.data.draft_status as any);
      }
    }
  });

  // studioError（審査申請エラーなど）も表示する
  useEffect(() => {
    if (studioError) {
      setErrorMessage(studioError);
      setSaveStatus("error");
    }
  }, [studioError]);

  // 初期データを取得
  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true);
      try {
        // まずdraftを取得
        const draftResult = await getCompanyInfoDraft();
        if (draftResult.error && !draftResult.error.includes("下書きが見つかりません")) {
          console.error("Failed to fetch company draft:", draftResult.error);
          setErrorMessage(draftResult.error);
          setCompany(emptyCompanyData);
          setCompanyId("");
        } else if (draftResult.data) {
          // draftデータを使用
          const draft = draftResult.data;
          setCurrentDraftId(draft.id);
          setDraftStatus(draft.draft_status as "draft" | "submitted" | "approved" | "rejected" | null);
          const companyState = {
            id: draft.company_id,
            name: draft.name || "",
            logo: draft.logo_url || "",
            industry: draft.industry || "",
            representative: draft.representative || "",
            established: draft.established || "",
            employees: draft.employees || "",
            website: draft.website || "",
            prefecture: (draft as any).prefecture || "",
            addressLine1: draft.address_line1 || "",
            addressLine2: draft.address_line2 || "",
            companyInfo: draft.company_info || ""
          };
          setCompany(companyState);
          setInitialCompany(companyState);
          setCompanyId(draft.company_id);

          // 本番のステータスを取得
          const prodResult = await getCompanyProfile();
          if (prodResult.data) {
            setProductionStatus(prodResult.data.status as "active" | "closed");
          }

          if (draft.established) {
            const parsed = parseEstablishedDate(draft.established);
            if (parsed) {
              setEstablishedYear(parsed.year);
              setEstablishedMonth(parsed.month);
            } else {
              const monthOnly = draft.established.match(/(\d{1,2})月/);
              if (monthOnly) {
                setEstablishedMonth(monthOnly[1].padStart(2, "0"));
              }
            }
          }
          if (draft.employees) {
            setEmployeesRange(draft.employees);
            setInitialEmployeesRange(draft.employees);
          }
        } else {
          // draftがない場合は本番テーブルから取得
          const result = await getCompanyProfile();
          if (result.error) {
            console.error("Failed to fetch company data:", result.error);
            if (result.error.includes("管理者") || result.error.includes("権限") || result.error.includes("認証")) {
              setErrorMessage(result.error);
            }
            setCompany(emptyCompanyData);
            setCompanyId("");
          } else if (result.data) {
            const companyData = dbToCompanyData(result.data);
            const companyState = {
              id: companyData.id,
              name: companyData.name,
              logo: companyData.logo,
              industry: companyData.industry,
              representative: companyData.representative,
              established: companyData.established,
              employees: companyData.employees,
              website: companyData.website,
              prefecture: companyData.prefecture || "",
              addressLine1: companyData.addressLine1,
              addressLine2: companyData.addressLine2,
              companyInfo: companyData.companyInfo
            };
            setCompany(companyState);
            setInitialCompany(companyState);
            setCompanyId(result.data.id);
            setProductionStatus(result.data.status as "active" | "closed");
            setDraftStatus("approved"); // 下書きがない場合は本番反映済みとして扱う
            if (companyData.established) {
              const parsed = parseEstablishedDate(companyData.established);
              if (parsed) {
                setEstablishedYear(parsed.year);
                setEstablishedMonth(parsed.month);
              } else {
                const monthOnly = companyData.established.match(/(\d{1,2})月/);
                if (monthOnly) {
                  setEstablishedMonth(monthOnly[1].padStart(2, "0"));
                }
              }
            }
            if (companyData.employees) {
              setEmployeesRange(companyData.employees);
              setInitialEmployeesRange(companyData.employees);
            }
          } else {
            setCompany(emptyCompanyData);
            setCompanyId("");
          }
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

  // バリデーション関数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "industry": {
        return validateRequired(value, "業界") || undefined;
      }
      case "representative": {
        const requiredError = validateRequired(value, "代表者名");
        if (requiredError) return requiredError;
        return validateMaxLength(value, REPRESENTATIVE_NAME_MAX_LENGTH, "代表者名") || undefined;
      }
      case "website":
        return validateUrlWithProtocol(value, "公式サイト") || undefined;
      case "addressLine1":
        return validateRequired(value, "住所(番地まで)") || undefined;
      case "addressLine2":
        return validateRequired(value, "住所(ビル名・部屋番号)") || undefined;
      case "companyInfo": {
        const requiredError = validateRequired(value, "企業情報");
        if (requiredError) return requiredError;
        return validateMaxLength(value, COMPANY_INFO_MAX_LENGTH, "企業情報") || undefined;
      }
      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSave = async (): Promise<{ error?: string; draftId?: string } | void> => {
    setStudioSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    const errors: typeof fieldErrors = {};
    let hasValidationError = false;

    if (!company.logo || company.logo.trim() === "") {
      errors.logo = "ロゴは必須です";
      hasValidationError = true;
    }
    const industryError = validateField("industry", company.industry || "");
    if (industryError) {
      errors.industry = industryError;
      hasValidationError = true;
    }
    const representativeError = validateField("representative", company.representative || "");
    if (representativeError) {
      errors.representative = representativeError;
      hasValidationError = true;
    }
    if (!establishedYear || !establishedMonth) {
      errors.established = "設立年月は必須です";
      hasValidationError = true;
    }
    if (!employeesRange || employeesRange === "") {
      errors.employees = "従業員数は必須です";
      hasValidationError = true;
    }
    if (!company.prefecture || company.prefecture === "") {
      errors.prefecture = "都道府県は必須です";
      hasValidationError = true;
    }
    const addressLine1Error = validateField("addressLine1", company.addressLine1 || "");
    if (addressLine1Error) {
      errors.addressLine1 = addressLine1Error;
      hasValidationError = true;
    }
    const addressLine2Error = validateField("addressLine2", company.addressLine2 || "");
    if (addressLine2Error) {
      errors.addressLine2 = addressLine2Error;
      hasValidationError = true;
    }
    const websiteError = validateField("website", company.website || "");
    if (websiteError) {
      errors.website = websiteError;
      hasValidationError = true;
    }
    const companyInfoError = validateField("companyInfo", company.companyInfo || "");
    if (companyInfoError) {
      errors.companyInfo = companyInfoError;
      hasValidationError = true;
    }

    if (hasValidationError) {
      setFieldErrors(errors);
      setSaveStatus("error");
      setErrorMessage("入力内容に誤りがあります。各フィールドのエラーを確認してください。");
      setStudioSaving(false);
      return { error: "入力内容を確認してください" };
    }

    try {
      const formData: {
        logo_url?: string;
        cover_image_url?: string;
        industry?: string;
        representative?: string;
        established?: string;
        employees?: string;
        website?: string;
        prefecture?: string;
        address_line1?: string;
        address_line2?: string;
        company_info?: string;
      } = {};

      if (company.logo !== undefined) {
        formData.logo_url = company.logo;
      }
      if (company.industry !== undefined) formData.industry = company.industry;
      if (company.representative !== undefined) formData.representative = company.representative;
      if (establishedYear && establishedMonth) {
        formData.established = formatEstablishedDate(establishedYear, establishedMonth);
      } else if (establishedMonth) {
        formData.established = `${establishedMonth}月`;
      } else if (company.established !== undefined) {
        formData.established = company.established;
      }
      if (employeesRange) {
        formData.employees = employeesRange;
      } else if (company.employees !== undefined) {
        formData.employees = company.employees;
      }
      if (company.prefecture !== undefined) formData.prefecture = company.prefecture;
      if (company.website !== undefined) formData.website = company.website;
      if (company.addressLine1 !== undefined) formData.address_line1 = company.addressLine1;
      if (company.addressLine2 !== undefined) formData.address_line2 = company.addressLine2;
      if (company.companyInfo !== undefined) formData.company_info = company.companyInfo;

      const result = await saveCompanyInfo(formData);
      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
        return { error: result.error };
      } else {
        if (result.data) {
          const draft = result.data;
          setCurrentDraftId(draft.id);
          setDraftStatus(draft.draft_status as "draft" | "submitted" | "approved" | "rejected" | null);
          const companyState = {
            id: draft.company_id,
            name: draft.name || "",
            logo: draft.logo_url || "",
            industry: draft.industry || "",
            representative: draft.representative || "",
            established: draft.established || "",
            employees: draft.employees || "",
            website: draft.website || "",
            prefecture: (draft as any).prefecture || "",
            addressLine1: draft.address_line1 || "",
            addressLine2: draft.address_line2 || "",
            companyInfo: draft.company_info || ""
          };
          setCompany(companyState);
          setInitialCompany(companyState);
          setCompanyId(draft.company_id);
          if (draft.established) {
            const parsed = parseEstablishedDate(draft.established);
            if (parsed) {
              setEstablishedYear(parsed.year);
              setEstablishedMonth(parsed.month);
            }
          }
          if (draft.employees) {
            setEmployeesRange(draft.employees);
            setInitialEmployeesRange(draft.employees);
          }
          setSaveStatus("success");
          return { draftId: draft.id };
        }
      }
    } catch (error) {
      setSaveStatus("error");
      const msg = error instanceof Error ? error.message : "保存に失敗しました";
      setErrorMessage(msg);
      return { error: msg };
    } finally {
      setStudioSaving(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setCompany((prev) => ({ ...prev, logo: url }));
  };

  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setEstablishedYear(year);
    if (year && establishedMonth) {
      setCompany((prev) => ({ ...prev, established: formatEstablishedDate(year, establishedMonth) }));
    } else {
      setCompany((prev) => ({ ...prev, established: "" }));
    }
  };

  const handleEstablishedMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setEstablishedMonth(month);
    if (establishedYear && month) {
      setCompany((prev) => ({ ...prev, established: formatEstablishedDate(establishedYear, month) }));
    } else {
      setCompany((prev) => ({ ...prev, established: "" }));
    }
  };

  const handleEmployeesRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setEmployeesRange(range);
    setCompany((prev) => ({ ...prev, employees: range }));
  };

  const hasChanges = () => {
    const fieldsToCompare: (keyof Partial<CompanyData>)[] = [
      "logo",
      "industry",
      "representative",
      "established",
      "website",
      "prefecture",
      "addressLine1",
      "addressLine2",
      "companyInfo"
    ];
    const fieldChanged = fieldsToCompare.some((field) => {
      const currentValue = company[field];
      const initialValue = initialCompany[field];
      const currentStr = typeof currentValue === "string" ? currentValue : "";
      const initialStr = typeof initialValue === "string" ? initialValue : "";
      return currentStr !== initialStr;
    });
    const employeesChanged = employeesRange !== initialEmployeesRange;
    return fieldChanged || employeesChanged;
  };

  // ページ離脱時の警告
  useUnsavedChanges(hasChanges);

  const hasValidationErrors = () => {
    return Object.values(fieldErrors).some((error) => error !== undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <StudioEditorAlerts showUnderReviewAlert={showUnderReviewAlert} showOlderVersionAlert={showOlderVersionAlert} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">企業プロフィール編集</h2>
          <p className="text-sm text-gray-500">企業の基本情報を編集し、審査申請を行うことができます。</p>
        </div>
        <StudioEditorStatusSection
          draftStatus={draftStatus}
          productionStatus={productionStatus}
          onToggleStatus={() => {}}
          hasProduction={!!companyId}
          disabled={isStudioSaving}
          showToggle={false}
        />
      </div>

      {(saveStatus === "error" || errorMessage) && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600 font-bold">×</span>
          <p className="text-sm font-bold text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* 企業プロフィール情報（1つのカードに集約） */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 企業情報セクション */}
        <div className="p-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">企業情報</h2>
        </div>
        <div className={`p-8 pt-2 space-y-6 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">会社名</label>
              <p className="text-base text-gray-900 font-medium">{company.name || "未設定"}</p>
            </div>
            <div className="space-y-2">
              <StudioLabel htmlFor="established-year" required>
                設立年月
              </StudioLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <StudioSelect
                    id="established-year"
                    value={establishedYear}
                    onChange={handleEstablishedYearChange}
                    error={!!fieldErrors.established}
                    disabled={isReadOnly}
                  >
                    <option value="">年を選択</option>
                    {generateYearOptions().map((year) => (
                      <option key={year} value={year.toString()}>
                        {year}年
                      </option>
                    ))}
                  </StudioSelect>
                </div>
                <div>
                  <StudioSelect
                    id="established-month"
                    value={establishedMonth}
                    onChange={handleEstablishedMonthChange}
                    error={!!fieldErrors.established}
                    disabled={isReadOnly}
                  >
                    <option value="">月を選択</option>
                    {generateMonthOptions().map((month) => (
                      <option key={month} value={month.toString().padStart(2, "0")}>
                        {month}月
                      </option>
                    ))}
                  </StudioSelect>
                </div>
              </div>
              {fieldErrors.established && (
                <p className="text-[10px] text-red-500 font-bold">{fieldErrors.established}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StudioFormField
              label="代表者名"
              name="representative"
              value={company.representative || ""}
              onChange={handleChange}
              required
              error={fieldErrors.representative}
              disabled={isReadOnly}
            />
            <div className="space-y-2">
              <StudioLabel htmlFor="employees" required>
                従業員数
              </StudioLabel>
              <StudioSelect
                id="employees"
                value={employeesRange}
                onChange={handleEmployeesRangeChange}
                error={!!fieldErrors.employees}
                disabled={isReadOnly}
              >
                {generateEmployeesRangeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </StudioSelect>
              {fieldErrors.employees && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.employees}</p>}
            </div>
          </div>

          <StudioFormField
            label="公式サイト"
            name="website"
            value={company.website || ""}
            onChange={handleChange}
            placeholder="https://example.com"
            required
            error={fieldErrors.website}
            disabled={isReadOnly}
          />
          <StudioFormField
            label="企業情報"
            name="companyInfo"
            type="textarea"
            value={company.companyInfo || ""}
            onChange={handleChange}
            required
            error={fieldErrors.companyInfo}
            rows={6}
            placeholder="企業の詳細情報を入力してください（300字以内）"
            maxLength={COMPANY_INFO_MAX_LENGTH}
            showCharCount
            disabled={isReadOnly}
          />
          <div className="space-y-2">
            <StudioLabel htmlFor="industry" required>
              業界
            </StudioLabel>
            <StudioSelect
              id="industry"
              name="industry"
              value={company.industry || ""}
              onChange={(e) => {
                setCompany((prev) => ({ ...prev, industry: e.target.value }));
                const error = validateField("industry", e.target.value);
                setFieldErrors((prev) => ({
                  ...prev,
                  industry: error
                }));
              }}
              error={!!fieldErrors.industry}
              disabled={isReadOnly}
            >
              {generateIndustryOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </StudioSelect>
            {fieldErrors.industry && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.industry}</p>}
          </div>
        </div>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* 本社所在地セクション */}
        <div className="p-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">本社所在地</h2>
        </div>
        <div className={`p-8 pt-2 space-y-6 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PrefectureSelect
              value={company.prefecture || ""}
              onChange={(e) => {
                const val = e.target.value;
                setCompany((prev) => ({ ...prev, prefecture: val }));
              }}
              error={fieldErrors.prefecture}
              disabled={isReadOnly}
              required
            />
            <StudioFormField
              label="市区町村・番地"
              name="addressLine1"
              value={company.addressLine1 || ""}
              onChange={handleChange}
              placeholder="例: 渋谷区1-2-3"
              required
              error={fieldErrors.addressLine1}
              disabled={isReadOnly}
            />
          </div>
          <StudioFormField
            label="ビル名・部屋番号"
            name="addressLine2"
            value={company.addressLine2 || ""}
            onChange={handleChange}
            placeholder="例: サンプルビル5階"
            error={fieldErrors.addressLine2}
            disabled={isReadOnly}
          />
        </div>

        {/* 区切り線 */}
        <div className="border-t border-gray-100" />

        {/* ロゴセクション */}
        <div className="p-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">ロゴ</h2>
        </div>
        <div className={`p-8 pt-2 space-y-6 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
          <div className="max-w-md">
            <StudioImageUpload
              label=""
              type="logo"
              currentUrl={company.logo}
              onUploadComplete={handleImageUpload}
              onUploadingChange={setIsLogoUploading}
              onError={(error) => {
                setErrorMessage(error);
                setSaveStatus("error");
              }}
              aspectRatio="square"
              helperText="400x400px 以上の正方形を推奨"
              customUploadFunction={async (file: File) => {
                return await uploadCompanyAsset(file, "logo");
              }}
              disabled={isReadOnly}
            />
          </div>
          {fieldErrors.logo && <p className="text-xs text-red-500 font-bold">{fieldErrors.logo}</p>}
        </div>
      </div>

      <DraftActionButtons
        onPreview={undefined}
        onSubmitForReview={submitForReview}
        isSubmitting={isSubmittingReview}
        isSubmitDisabled={isStudioSaving || isLogoUploading || hasValidationErrors()}
        showSubmitButton={!isReadOnly}
        showPreviewButton={false}
        hasChanges={hasChanges()}
      />
    </div>
  );
}
