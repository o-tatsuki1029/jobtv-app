"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  Building,
  Shield,
  Bell,
  HelpCircle,
  Save,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Mail
} from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import { getCompanyProfile } from "@/lib/actions/company-profile-actions";
import { saveCompanyInfo } from "@/lib/actions/company-info-actions";
import { uploadCompanyAsset } from "@/lib/actions/company-profile-actions";
import { dbToCompanyData } from "@/components/company";
import type { CompanyData } from "@/components/company";
import { getTeamMembers, removeTeamMember, updateTeamMemberRole } from "@/lib/actions/team-member-actions";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { validateRequired, validateMaxLength, validateUrlWithProtocol } from "@jobtv-app/shared/utils/validation";
import type { Tables } from "@jobtv-app/shared/types";

// 空の初期データ
const emptyCompanyData: Partial<CompanyData> = {
  id: "",
  name: "",
  logo: "",
  representative: "",
  established: "",
  employees: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  companyInfo: ""
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("一般設定");

  const tabs = [
    { name: "一般設定", icon: Settings },
    { name: "企業プロフィール", icon: Building },
    { name: "チームメンバー", icon: User },
    { name: "通知", icon: Bell },
    { name: "セキュリティ", icon: Shield },
    { name: "ヘルプ・サポート", icon: HelpCircle }
  ];

  // 企業プロフィール用のstate
  const [company, setCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialCompany, setInitialCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialEmployeesRange, setInitialEmployeesRange] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    logo?: string;
    representative?: string;
    established?: string;
    employees?: string;
    website?: string;
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

  // 年のオプションを生成（現在から200年前まで）
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 200; i--) {
      years.push(i);
    }
    return years;
  };

  // 月のオプションを生成（1-12月）
  const generateMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  // 従業員数の範囲オプションを生成
  const generateEmployeesRangeOptions = () => {
    return [
      { value: "", label: "選択してください" },
      { value: "1-10人", label: "1-10人" },
      { value: "11-50人", label: "11-50人" },
      { value: "51-100人", label: "51-100人" },
      { value: "101-300人", label: "101-300人" },
      { value: "301-500人", label: "301-500人" },
      { value: "501-1000人", label: "501-1000人" },
      { value: "1001-5000人", label: "1001-5000人" },
      { value: "5001-10000人", label: "5001-10000人" },
      { value: "10001人以上", label: "10001人以上" }
    ];
  };

  // 初期データを取得
  useEffect(() => {
    if (activeTab === "企業プロフィール") {
      const fetchCompanyData = async () => {
        setIsLoading(true);
        try {
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
              representative: companyData.representative,
              established: companyData.established,
              employees: companyData.employees,
              website: companyData.website,
              addressLine1: companyData.addressLine1,
              addressLine2: companyData.addressLine2,
              companyInfo: companyData.companyInfo
            };
            setCompany(companyState);
            setInitialCompany(companyState);
            setCompanyId(result.data.id);
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
        } catch (error) {
          console.error("Error fetching company data:", error);
          setCompany(emptyCompanyData);
          setCompanyId("");
        } finally {
          setIsLoading(false);
        }
      };
      fetchCompanyData();
    }
  }, [activeTab]);

  // バリデーション関数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "representative": {
        const requiredError = validateRequired(value, "代表者名");
        if (requiredError) return requiredError;
        return validateMaxLength(value, 50, "代表者名") || undefined;
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
        return validateMaxLength(value, 300, "企業情報") || undefined;
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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    const errors: typeof fieldErrors = {};
    let hasValidationError = false;

    if (!company.logo || company.logo.trim() === "") {
      errors.logo = "ロゴは必須です";
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
      setIsSaving(false);
      return;
    }

    try {
      const formData: {
        logo_url?: string;
        cover_image_url?: string;
        representative?: string;
        established?: string;
        employees?: string;
        website?: string;
        address_line1?: string;
        address_line2?: string;
        company_info?: string;
      } = {};

      if (company.logo !== undefined) {
        formData.logo_url = company.logo;
      }
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
      if (company.website !== undefined) formData.website = company.website;
      if (company.addressLine1 !== undefined) formData.address_line1 = company.addressLine1;
      if (company.addressLine2 !== undefined) formData.address_line2 = company.addressLine2;
      if (company.companyInfo !== undefined) formData.company_info = company.companyInfo;

      const result = await saveCompanyInfo(formData);
      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        if (result.data) {
          const companyData = dbToCompanyData(result.data);
          const companyState = {
            id: companyData.id,
            name: companyData.name,
            logo: companyData.logo,
            representative: companyData.representative,
            established: companyData.established,
            employees: companyData.employees,
            website: companyData.website,
            addressLine1: companyData.addressLine1,
            addressLine2: companyData.addressLine2,
            companyInfo: companyData.companyInfo
          };
          setCompany(companyState);
          setInitialCompany(companyState);
          setCompanyId(result.data.id);
          if (companyData.established) {
            const parsed = parseEstablishedDate(companyData.established);
            if (parsed) {
              setEstablishedYear(parsed.year);
              setEstablishedMonth(parsed.month);
            }
          }
          if (companyData.employees) {
            setEmployeesRange(companyData.employees);
            setInitialEmployeesRange(companyData.employees);
          }
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
      "representative",
      "established",
      "website",
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

  const renderContent = () => {
    if (activeTab === "企業プロフィール") {
      if (isLoading) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        );
      }

      return (
        <div className="space-y-8">
          {/* 保存ステータス表示 */}
          {saveStatus === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-bold text-green-800">保存が完了しました</p>
            </div>
          )}

          {(saveStatus === "error" || errorMessage) && errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <span className="text-red-600 font-bold">×</span>
              <p className="text-sm font-bold text-red-800">{errorMessage}</p>
            </div>
          )}

          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">基本情報</h2>
            </div>
            <div className="p-8 space-y-6">
              {/* 会社名と設立年月 */}
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

              {/* 代表者名と従業員数 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StudioFormField
                  label="代表者名"
                  name="representative"
                  value={company.representative || ""}
                  onChange={handleChange}
                  required
                  error={fieldErrors.representative}
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
                  >
                    {generateEmployeesRangeOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </StudioSelect>
                  {fieldErrors.employees && (
                    <p className="text-[10px] text-red-500 font-bold">{fieldErrors.employees}</p>
                  )}
                </div>
              </div>

              {/* 住所1、住所2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StudioFormField
                  label="住所(番地まで)"
                  name="addressLine1"
                  value={company.addressLine1 || ""}
                  onChange={handleChange}
                  placeholder="例: 東京都渋谷区1-2-3"
                  required
                  error={fieldErrors.addressLine1}
                />
                <StudioFormField
                  label="住所(ビル名・部屋番号)"
                  name="addressLine2"
                  value={company.addressLine2 || ""}
                  onChange={handleChange}
                  placeholder="例: サンプルビル5階"
                  required
                  error={fieldErrors.addressLine2}
                />
              </div>

              {/* 公式サイト */}
              <StudioFormField
                label="公式サイト"
                name="website"
                value={company.website || ""}
                onChange={handleChange}
                placeholder="https://example.com"
                required
                error={fieldErrors.website}
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
                maxLength={300}
                showCharCount
              />

              {/* ロゴ */}
              <div className="pt-6 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <StudioLabel required>ロゴ</StudioLabel>
                </div>
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
                  />
                </div>
                {fieldErrors.logo && <p className="text-xs text-red-500 font-bold">{fieldErrors.logo}</p>}
              </div>

              {/* 変更を保存ボタン */}
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <StudioButton
                  icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  onClick={handleSave}
                  disabled={isSaving || isLogoUploading || !hasChanges() || hasValidationErrors()}
                >
                  {isSaving ? "保存中..." : isLogoUploading ? "アップロード中..." : "変更を保存"}
                </StudioButton>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // チームメンバータブのコンテンツ
    if (activeTab === "チームメンバー") {
      return <TeamMembersContent />;
    }

    // その他のタブのコンテンツ
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">{activeTab}</h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StudioFormField label="企業名" name="companyName" value="サンプル株式会社" />
            <StudioFormField label="代表電話番号" name="phone" value="03-1234-5678" />
            <div className="md:col-span-2">
              <StudioFormField label="管理用メールアドレス" name="email" type="email" value="admin@example.com" />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <StudioButton icon={<Save className="w-4 h-4" />}>設定を保存</StudioButton>
          </div>
        </div>
      </div>
    );
  };

  // チームメンバーコンテンツコンポーネント
  function TeamMembersContent() {
    const [members, setMembers] = useState<Tables<"profiles">[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

    useEffect(() => {
      const fetchMembers = async () => {
        setIsLoading(true);
        setError(null);
        const result = await getTeamMembers();
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setMembers(result.data);
        }
        setIsLoading(false);
      };
      fetchMembers();
    }, []);

    const handleRemoveMember = async (memberId: string) => {
      if (!confirm("このメンバーをチームから削除しますか？")) {
        return;
      }

      setRemovingMemberId(memberId);
      const result = await removeTeamMember(memberId);
      if (result.error) {
        setError(result.error);
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
      setRemovingMemberId(null);
    };

    const handleUpdateRole = async (memberId: string, role: "admin" | "recruiter") => {
      setUpdatingMemberId(memberId);
      const result = await updateTeamMemberRole(memberId, role);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? result.data! : m)));
      }
      setUpdatingMemberId(null);
    };

    const getMemberName = (member: Tables<"profiles">) => {
      if (member.full_name) return member.full_name;
      if (member.first_name && member.last_name) {
        return `${member.last_name} ${member.first_name}`;
      }
      return member.first_name || member.last_name || member.email || "名前未設定";
    };

    if (isLoading) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-lg text-gray-900">チームメンバー</h2>
          </div>
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-red-600 font-bold">×</span>
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">チームメンバー</h2>
            <StudioButton variant="outline" icon={<Mail className="w-4 h-4" />}>
              メンバーを招待
            </StudioButton>
          </div>
          <div className="p-6">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">チームメンバーがいません</p>
                <p className="text-sm text-gray-400 mt-2">メンバーを招待してチームに追加してください</p>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{getMemberName(member)}</p>
                        <p className="text-sm text-gray-500 truncate">{member.email || "メールアドレス未設定"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StudioSelect
                          value={member.role || "recruiter"}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as "admin" | "recruiter")}
                          disabled={updatingMemberId === member.id}
                          className="w-32"
                        >
                          <option value="recruiter">採用担当者</option>
                          <option value="admin">管理者</option>
                        </StudioSelect>
                        <StudioButton
                          variant="outline"
                          icon={
                            removingMemberId === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )
                          }
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMemberId === member.id}
                        >
                          削除
                        </StudioButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">設定</h1>
        <p className="text-gray-500 font-medium">企業プロフィールやアカウントの設定を管理します。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* サイドナビ */}
        <div className="lg:col-span-1 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === item.name
                  ? "bg-black text-white shadow-lg shadow-black/5"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}
        </div>

        {/* フォーム */}
        <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
