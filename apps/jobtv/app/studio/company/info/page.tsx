"use client";

import React, { useState, useEffect } from "react";
import { Building, Save, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { getCompanyProfile } from "@/lib/actions/company-profile-actions";
import { saveCompanyInfo } from "@/lib/actions/company-info-actions";
import { dbToCompanyData } from "@/components/company";
import type { CompanyData } from "@/components/company";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";

// 空の初期データ
const emptyCompanyData: Partial<CompanyData> = {
  id: "",
  name: "",
  logo: "",
  coverImage: "",
  representative: "",
  established: "",
  employees: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  companyInfo: ""
};

export default function CompanyInfoPage() {
  const [company, setCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialCompany, setInitialCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [initialEmployeesRange, setInitialEmployeesRange] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
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

  // 初期データを取得
  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true);

      try {
        // パラメータなしで呼び出し（常にログイン中のユーザーの企業IDを使用）
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
          const companyState = {
            id: companyData.id,
            name: companyData.name,
            logo: companyData.logo,
            coverImage: companyData.coverImage,
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

          // 設立年月をパースして年と月に分ける
          if (companyData.established) {
            const parsed = parseEstablishedDate(companyData.established);
            if (parsed) {
              setEstablishedYear(parsed.year);
              setEstablishedMonth(parsed.month);
            } else {
              // 年が含まれていない場合（月のみの場合）
              const monthOnly = companyData.established.match(/(\d{1,2})月/);
              if (monthOnly) {
                setEstablishedMonth(monthOnly[1].padStart(2, "0"));
              }
            }
          }

          // 従業員数を範囲に設定
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
  }, []);

  // 設立年月をパースする関数
  const parseEstablishedDate = (dateString: string): { year: string; month: string } | null => {
    if (!dateString) return null;

    // YYYY年MM月形式
    const pattern1 = /^(\d{4})年(\d{1,2})月?$/;
    const match1 = dateString.match(pattern1);
    if (match1) {
      return { year: match1[1], month: match1[2].padStart(2, "0") };
    }

    // YYYY-MM、YYYY/MM、YYYY.MM形式
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

  // バリデーション関数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "representative":
        if (value.trim() && value.length > 50) {
          return "代表者名は50文字以内で入力してください";
        }
        return undefined;

      case "established":
        // プルダウンなのでバリデーション不要
        return undefined;

      case "employees":
        // プルダウンなのでバリデーション不要
        return undefined;

      case "website":
        if (value.trim()) {
          // URL形式をチェック（http://またはhttps://で始まる）
          const urlPattern = /^https?:\/\/.+/;
          if (!urlPattern.test(value.trim())) {
            return "公式サイトは「https://」または「http://」で始まるURL形式で入力してください";
          }
        }
        return undefined;

      case "companyInfo":
        if (value.length > 300) {
          return "企業情報は300字以内で入力してください";
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));

    // リアルタイムバリデーション
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

    // 全フィールドのバリデーション
    const errors: typeof fieldErrors = {};
    let hasValidationError = false;

    if (company.representative !== undefined) {
      const error = validateField("representative", company.representative || "");
      if (error) {
        errors.representative = error;
        hasValidationError = true;
      }
    }
    // 設立年月はプルダウンなのでバリデーション不要
    // 従業員数はプルダウンなのでバリデーション不要
    if (company.website !== undefined) {
      const error = validateField("website", company.website || "");
      if (error) {
        errors.website = error;
        hasValidationError = true;
      }
    }

    if (hasValidationError) {
      setFieldErrors(errors);
      setSaveStatus("error");
      setErrorMessage("入力内容に誤りがあります。各フィールドのエラーを確認してください。");
      setIsSaving(false);
      return;
    }

    try {
      // ロゴとカバー画像が存在する場合は必ず送信（空文字列も含む）
      // これにより、削除した場合（空文字列）も正しく保存される
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

      // ロゴは常に送信（空文字列の場合はnullに変換される）
      if (company.logo !== undefined) {
        formData.logo_url = company.logo;
      }

      // カバー画像は常に送信（空文字列の場合はnullに変換される）
      if (company.coverImage !== undefined) {
        formData.cover_image_url = company.coverImage;
      }

      // その他のフィールド
      if (company.representative !== undefined) formData.representative = company.representative;
      // 設立年月は年と月から生成
      if (establishedYear && establishedMonth) {
        formData.established = formatEstablishedDate(establishedYear, establishedMonth);
      } else if (establishedMonth) {
        // 年が選択されていなくても月だけでも保存
        formData.established = `${establishedMonth}月`;
      } else if (company.established !== undefined) {
        formData.established = company.established;
      }
      // 従業員数は範囲から取得
      if (employeesRange) {
        formData.employees = employeesRange;
      } else if (company.employees !== undefined) {
        formData.employees = company.employees;
      }
      if (company.website !== undefined) formData.website = company.website;
      if (company.addressLine1 !== undefined) formData.address_line1 = company.addressLine1;
      if (company.addressLine2 !== undefined) formData.address_line2 = company.addressLine2;
      if (company.companyInfo !== undefined) formData.company_info = company.companyInfo;

      console.log("Saving company info with formData:", formData);

      const result = await saveCompanyInfo(formData);

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        // 保存成功後、最新データで状態を更新
        if (result.data) {
          const companyData = dbToCompanyData(result.data);
          const companyState = {
            id: companyData.id,
            name: companyData.name,
            logo: companyData.logo,
            coverImage: companyData.coverImage,
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

          // 設立年月をパースして年と月に分ける
          if (companyData.established) {
            const parsed = parseEstablishedDate(companyData.established);
            if (parsed) {
              setEstablishedYear(parsed.year);
              setEstablishedMonth(parsed.month);
            }
          }

          // 従業員数を範囲に設定
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

  const handleImageUpload = (field: "logo" | "coverImage", url: string) => {
    setCompany((prev) => ({ ...prev, [field]: url }));
  };

  // 設立年月の年を変更
  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setEstablishedYear(year);
    if (year && establishedMonth) {
      setCompany((prev) => ({ ...prev, established: formatEstablishedDate(year, establishedMonth) }));
    } else {
      setCompany((prev) => ({ ...prev, established: "" }));
    }
  };

  // 設立年月の月を変更
  const handleEstablishedMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setEstablishedMonth(month);
    if (establishedYear && month) {
      setCompany((prev) => ({ ...prev, established: formatEstablishedDate(establishedYear, month) }));
    } else {
      setCompany((prev) => ({ ...prev, established: "" }));
    }
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

  // 従業員数の範囲を変更
  const handleEmployeesRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setEmployeesRange(range);
    setCompany((prev) => ({ ...prev, employees: range }));
  };

  // 変更があるかどうかを判定
  const hasChanges = () => {
    const fieldsToCompare: (keyof Partial<CompanyData>)[] = [
      "logo",
      "coverImage",
      "representative",
      "established",
      "website",
      "addressLine1",
      "addressLine2",
      "companyInfo"
    ];

    // 通常のフィールドの変更をチェック
    const fieldChanged = fieldsToCompare.some((field) => {
      const currentValue = company[field];
      const initialValue = initialCompany[field];
      const currentStr = typeof currentValue === "string" ? currentValue : "";
      const initialStr = typeof initialValue === "string" ? initialValue : "";
      return currentStr !== initialStr;
    });

    // 従業員数の範囲の変更をチェック
    const employeesChanged = employeesRange !== initialEmployeesRange;

    return fieldChanged || employeesChanged;
  };

  // バリデーションエラーがあるかどうかを判定
  const hasValidationErrors = () => {
    return Object.values(fieldErrors).some((error) => error !== undefined);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">企業情報管理</h1>
          <p className="text-gray-500 font-medium">企業の基本情報を編集します。</p>
        </div>
        <StudioButton
          icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={isSaving || isLogoUploading || isCoverImageUploading || !hasChanges() || hasValidationErrors()}
        >
          {isSaving ? "保存中..." : isLogoUploading ? "アップロード中..." : "変更を保存"}
        </StudioButton>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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
                  <StudioLabel>会社名</StudioLabel>
                  <p className="text-base text-gray-900 font-medium">{company.name || "未設定"}</p>
                </div>
                <div className="space-y-2">
                  <StudioLabel htmlFor="established-year">設立年月</StudioLabel>
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
                  {fieldErrors.established ? (
                    <p className="text-[10px] text-red-500 font-bold">{fieldErrors.established}</p>
                  ) : null}
                </div>
              </div>

              {/* 代表者名と従業員数 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StudioFormField
                  label="代表者名"
                  name="representative"
                  value={company.representative || ""}
                  onChange={handleChange}
                  error={fieldErrors.representative}
                />
                <div className="space-y-2">
                  <StudioLabel htmlFor="employees">従業員数</StudioLabel>
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
                  {fieldErrors.employees ? (
                    <p className="text-[10px] text-red-500 font-bold">{fieldErrors.employees}</p>
                  ) : null}
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
                  error={fieldErrors.addressLine1}
                />
                <StudioFormField
                  label="住所(ビル名・部屋番号)"
                  name="addressLine2"
                  value={company.addressLine2 || ""}
                  onChange={handleChange}
                  placeholder="例: サンプルビル5階"
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
                error={fieldErrors.website}
              />
              <StudioFormField
                label="企業情報"
                name="companyInfo"
                type="textarea"
                value={company.companyInfo || ""}
                onChange={handleChange}
                error={fieldErrors.companyInfo}
                rows={6}
                placeholder="企業の詳細情報を入力してください（300字以内）"
              />
              {company.companyInfo !== undefined && company.companyInfo !== null && (
                <p className="text-[10px] text-gray-400 text-right">{company.companyInfo.length}/300文字</p>
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
                label="ロゴ"
                type="logo"
                currentUrl={company.logo}
                onUploadComplete={(url) => handleImageUpload("logo", url)}
                onUploadingChange={setIsLogoUploading}
                onError={(error) => {
                  setErrorMessage(error);
                  setSaveStatus("error");
                }}
                aspectRatio="square"
                helperText="400x400px 以上の正方形を推奨"
              />
              <StudioImageUpload
                label="カバー画像"
                type="cover"
                currentUrl={company.coverImage}
                onUploadComplete={(url) => handleImageUpload("coverImage", url)}
                onUploadingChange={setIsCoverImageUploading}
                onError={(error) => {
                  setErrorMessage(error);
                  setSaveStatus("error");
                }}
                aspectRatio="wide"
                helperText="1200x400px 以上を推奨"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
