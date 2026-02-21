"use client";

import React, { useState, useEffect } from "react";
import { Building, Plus, X, Search, LogIn } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import { getAllCompanies, createCompanyWithRecruiter } from "@/lib/actions/company-account-actions";
import { proxyLoginAsCompany } from "@/lib/actions/proxy-login-actions";
import { validateRequired, validateMaxLength, validateUrlWithProtocol, validateEmail, validateKatakana } from "@jobtv-app/shared/utils/validation";
import { REPRESENTATIVE_NAME_MAX_LENGTH, COMPANY_INFO_MAX_LENGTH } from "@/constants/validation";
import type { Tables } from "@jobtv-app/shared/types";
import {
  generateIndustryOptions,
  generateYearOptions,
  generateMonthOptions,
  generateEmployeesRangeOptions
} from "@/constants/company-options";

type Company = Tables<"companies">;

export default function AdminCompanyAccountsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name_asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    established?: string;
    representative?: string;
    employees?: string;
    website?: string;
    company_info?: string;
    industry?: string;
    prefecture?: string;
    address_line1?: string;
    address_line2?: string;
    email?: string;
    last_name?: string;
    first_name?: string;
    last_name_kana?: string;
    first_name_kana?: string;
    _general?: string; // 一般的なエラーメッセージ用
  }>({});

  // フォーム状態
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    prefecture: "",
    address_line1: "",
    address_line2: "",
    website: "",
    representative: "",
    established: "",
    employees: "",
    company_info: "",
    status: "active" as "active" | "closed",
  });

  // 設立年月の状態（年と月を分けて管理）
  const [establishedYear, setEstablishedYear] = useState<string>("");
  const [establishedMonth, setEstablishedMonth] = useState<string>("");

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
    return `${year}年${parseInt(month)}月`;
  };

  const [recruiterForm, setRecruiterForm] = useState({
    email: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
  });

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllCompanies();
    if (fetchError) {
      setError(fetchError);
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // 検索とソートを適用
  const filteredAndSortedCompanies = [...companies]
    .filter((company) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (company.name || "").toLowerCase().includes(query);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
        default:
          return (b.name || "").localeCompare(a.name || "");
      }
    });

  const handleOpenCreateModal = () => {
    setCompanyForm({
      name: "",
      industry: "",
      prefecture: "",
      address_line1: "",
      address_line2: "",
      website: "",
      representative: "",
      established: "",
      employees: "",
      company_info: "",
      status: "active",
    });
    setEstablishedYear("");
    setEstablishedMonth("");
    setRecruiterForm({
      email: "",
      last_name: "",
      first_name: "",
      last_name_kana: "",
      first_name_kana: "",
    });
    setSuccessMessage(null);
    setError(null);
    setFieldErrors({});
    setIsSubmitting(false);
    setIsCreateModalOpen(true);
  };

  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setEstablishedYear(year);
    const newEstablished = year && establishedMonth ? formatEstablishedDate(year, establishedMonth) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
    const error = validateField("established", newEstablished);
    setFieldErrors((prev) => ({
      ...prev,
      established: error,
    }));
  };

  const handleEstablishedMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setEstablishedMonth(month);
    const newEstablished = establishedYear && month ? formatEstablishedDate(establishedYear, month) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
    const error = validateField("established", newEstablished);
    setFieldErrors((prev) => ({
      ...prev,
      established: error,
    }));
  };

  const handleEmployeesRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setCompanyForm((prev) => ({ ...prev, employees: range }));
    const error = validateField("employees", range);
    setFieldErrors((prev) => ({
      ...prev,
      employees: error,
    }));
  };

  // バリデーション関数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "name": {
        const requiredError = validateRequired(value, "企業名");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "established": {
        if (!establishedYear || !establishedMonth) {
          return "設立年月は必須です";
        }
        return undefined;
      }
      case "representative": {
        const requiredError = validateRequired(value, "代表者名");
        if (requiredError) return requiredError;
        return validateMaxLength(value, REPRESENTATIVE_NAME_MAX_LENGTH, "代表者名") || undefined;
      }
      case "employees": {
        const requiredError = validateRequired(value, "従業員数");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "website": {
        const requiredError = validateRequired(value, "公式サイト");
        if (requiredError) return requiredError;
        return validateUrlWithProtocol(value, "公式サイト") || undefined;
      }
      case "company_info": {
        const requiredError = validateRequired(value, "企業情報");
        if (requiredError) return requiredError;
        return validateMaxLength(value, COMPANY_INFO_MAX_LENGTH, "企業情報") || undefined;
      }
      case "industry": {
        const requiredError = validateRequired(value, "業界");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "prefecture": {
        const requiredError = validateRequired(value, "都道府県");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "address_line1": {
        const requiredError = validateRequired(value, "市区町村・番地");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "email":
        return validateEmail(value) || undefined;
      case "last_name":
      case "first_name":
        return validateRequired(value, name === "last_name" ? "姓" : "名") || undefined;
      case "last_name_kana":
      case "first_name_kana": {
        const requiredError = validateRequired(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）");
        if (requiredError) return requiredError;
        return validateKatakana(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）") || undefined;
      }
      default:
        return undefined;
    }
  };

  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };


  const handleRecruiterFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecruiterForm((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleCreateCompany = async () => {
    // バリデーション
    const errors: typeof fieldErrors = {};
    let hasValidationError = false;

    // 企業情報のバリデーション
    const nameError = validateField("name", companyForm.name);
    if (nameError) {
      errors.name = nameError;
      hasValidationError = true;
    }

    const establishedError = validateField("established", companyForm.established);
    if (establishedError) {
      errors.established = establishedError;
      hasValidationError = true;
    }

    const representativeError = validateField("representative", companyForm.representative);
    if (representativeError) {
      errors.representative = representativeError;
      hasValidationError = true;
    }

    const employeesError = validateField("employees", companyForm.employees);
    if (employeesError) {
      errors.employees = employeesError;
      hasValidationError = true;
    }

    const websiteError = validateField("website", companyForm.website);
    if (websiteError) {
      errors.website = websiteError;
      hasValidationError = true;
    }

    const companyInfoError = validateField("company_info", companyForm.company_info);
    if (companyInfoError) {
      errors.company_info = companyInfoError;
      hasValidationError = true;
    }

    const industryError = validateField("industry", companyForm.industry);
    if (industryError) {
      errors.industry = industryError;
      hasValidationError = true;
    }

    const prefectureError = validateField("prefecture", companyForm.prefecture);
    if (prefectureError) {
      errors.prefecture = prefectureError;
      hasValidationError = true;
    }

    const addressLine1Error = validateField("address_line1", companyForm.address_line1);
    if (addressLine1Error) {
      errors.address_line1 = addressLine1Error;
      hasValidationError = true;
    }

    // リクルーター情報のバリデーション
    const emailError = validateField("email", recruiterForm.email);
    if (emailError) {
      errors.email = emailError;
      hasValidationError = true;
    }

    const lastNameError = validateField("last_name", recruiterForm.last_name);
    if (lastNameError) {
      errors.last_name = lastNameError;
      hasValidationError = true;
    }

    const firstNameError = validateField("first_name", recruiterForm.first_name);
    if (firstNameError) {
      errors.first_name = firstNameError;
      hasValidationError = true;
    }

    const lastNameKanaError = validateField("last_name_kana", recruiterForm.last_name_kana);
    if (lastNameKanaError) {
      errors.last_name_kana = lastNameKanaError;
      hasValidationError = true;
    }

    const firstNameKanaError = validateField("first_name_kana", recruiterForm.first_name_kana);
    if (firstNameKanaError) {
      errors.first_name_kana = firstNameKanaError;
      hasValidationError = true;
    }

    if (hasValidationError) {
      setFieldErrors({
        ...errors,
        _general: "入力内容に誤りがあります。各フィールドのエラーを確認してください。",
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const { data, error: createError } = await createCompanyWithRecruiter(
      {
        name: companyForm.name,
        industry: companyForm.industry || null,
        prefecture: companyForm.prefecture || null,
        address_line1: companyForm.address_line1 || null,
        address_line2: companyForm.address_line2 || null,
        website: companyForm.website || null,
        representative: companyForm.representative || null,
        established: companyForm.established || null,
        employees: companyForm.employees || null,
        company_info: companyForm.company_info || null,
        status: companyForm.status,
      },
      {
        email: recruiterForm.email,
        last_name: recruiterForm.last_name,
        first_name: recruiterForm.first_name,
        last_name_kana: recruiterForm.last_name_kana,
        first_name_kana: recruiterForm.first_name_kana,
      }
    );

    if (createError) {
      setIsSubmitting(false);
      // エラーメッセージはモーダル内に表示するため、setErrorは使用しない
      setFieldErrors((prev) => ({
        ...prev,
        _general: createError,
      }));
      return;
    }

    if (data) {
      setSuccessMessage("企業とリクルーターアカウントを作成しました。初期パスワード設定の案内メールを送信しました。");
      setIsCreateModalOpen(false);
      await loadCompanies();
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <StudioBadge variant="success">有効</StudioBadge>;
    } else if (status === "closed") {
      return <StudioBadge variant="neutral">無効</StudioBadge>;
    }
    return <StudioBadge variant="neutral">未設定</StudioBadge>;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-10">
      <ErrorMessage message={error || ""} />
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Building className="w-8 h-8" />
            企業アカウント管理
          </h1>
          <p className="text-gray-500 font-medium">企業とリクルーターアカウントを管理できます。</p>
        </div>
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
          新規企業を作成
        </StudioButton>
      </div>

      {/* 検索とソート */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* 検索フィールド */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="企業名で検索"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-gray-900"
          />
        </div>

        {/* ソート */}
        {companies.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-gray-700">並び順:</label>
            <StudioSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name_asc">企業名（あいうえお順）</option>
              <option value="name_desc">企業名（逆順）</option>
            </StudioSelect>
          </div>
        )}
      </div>

      {/* 企業一覧テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">企業名</th>
                <th className="px-6 py-4">業界</th>
                <th className="px-6 py-4">所在地</th>
                <th className="px-6 py-4">ステータス</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredAndSortedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>{searchQuery ? "検索結果が見つかりませんでした" : "企業がありません"}</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{company.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.industry || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.prefecture || "-"}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(company.status)}</td>
                    <td className="px-6 py-4">
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<LogIn className="w-4 h-4" />}
                        onClick={async () => {
                          const result = await proxyLoginAsCompany(company.id);
                          if (result.error) {
                            setError(result.error);
                          } else if (result.data?.redirectUrl) {
                            window.location.href = result.data.redirectUrl;
                          }
                        }}
                      >
                        代理ログイン
                      </StudioButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 件数表示 */}
      {companies.length > 0 && (
        <div className="flex items-center justify-center pt-4">
          <p className="text-sm text-gray-500">
            {searchQuery
              ? `検索結果: ${filteredAndSortedCompanies.length}社 / 全${companies.length}社`
              : `全${companies.length}社`}
          </p>
        </div>
      )}

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">新規企業を作成</h2>
              <p className="text-sm text-gray-600">企業情報とリクルーターアカウントを作成します。</p>
            </div>

            <div className="p-8 space-y-6">
              {fieldErrors._general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{fieldErrors._general}</p>
                </div>
              )}

              {/* 企業情報セクション */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">企業情報</h3>
                <div className="space-y-6">
                  <StudioFormField
                    label="企業名"
                    name="name"
                    value={companyForm.name}
                    onChange={handleCompanyFormChange}
                    placeholder="企業名を入力"
                    required
                    error={fieldErrors.name}
                    disabled={isSubmitting}
                  />

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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
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
                    {fieldErrors.established && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.established}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StudioFormField
                      label="代表者名"
                      name="representative"
                      value={companyForm.representative}
                      onChange={handleCompanyFormChange}
                      placeholder="代表者名を入力"
                      required
                      error={fieldErrors.representative}
                      disabled={isSubmitting}
                    />
                    <div className="space-y-2">
                      <StudioLabel htmlFor="employees" required>
                        従業員数
                      </StudioLabel>
                      <StudioSelect
                        id="employees"
                        name="employees"
                        value={companyForm.employees}
                        onChange={handleEmployeesRangeChange}
                        error={!!fieldErrors.employees}
                        disabled={isSubmitting}
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
                    value={companyForm.website}
                    onChange={handleCompanyFormChange}
                    placeholder="https://example.com"
                    required
                    error={fieldErrors.website}
                    disabled={isSubmitting}
                  />

                  <StudioFormField
                    label="企業情報"
                    name="company_info"
                    type="textarea"
                    value={companyForm.company_info}
                    onChange={handleCompanyFormChange}
                    placeholder="企業の詳細情報を入力してください（300字以内）"
                    rows={6}
                    maxLength={COMPANY_INFO_MAX_LENGTH}
                    showCharCount
                    required
                    error={fieldErrors.company_info}
                    disabled={isSubmitting}
                  />

                  <div className="space-y-2">
                    <StudioLabel htmlFor="industry" required>
                      業界
                    </StudioLabel>
                    <StudioSelect
                      id="industry"
                      name="industry"
                      value={companyForm.industry || ""}
                      onChange={handleCompanyFormChange}
                      error={!!fieldErrors.industry}
                      disabled={isSubmitting}
                    >
                      {generateIndustryOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </StudioSelect>
                    {fieldErrors.industry && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.industry}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PrefectureSelect
                      value={companyForm.prefecture}
                      onChange={(e) => setCompanyForm({ ...companyForm, prefecture: e.target.value })}
                      error={fieldErrors.prefecture}
                      disabled={isSubmitting}
                      required
                    />
                    <StudioFormField
                      label="市区町村・番地"
                      name="address_line1"
                      value={companyForm.address_line1}
                      onChange={handleCompanyFormChange}
                      placeholder="例: 渋谷区1-2-3"
                      required
                      error={fieldErrors.address_line1}
                      disabled={isSubmitting}
                    />
                  </div>

                  <StudioFormField
                    label="ビル名・部屋番号"
                    name="address_line2"
                    value={companyForm.address_line2}
                    onChange={handleCompanyFormChange}
                    placeholder="例: サンプルビル5階"
                    error={fieldErrors.address_line2}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* リクルーター情報セクション */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">リクルーター情報</h3>
                <div className="space-y-4">
                  <StudioFormField
                    label="メールアドレス"
                    name="email"
                    type="email"
                    value={recruiterForm.email}
                    onChange={handleRecruiterFormChange}
                    placeholder="recruiter@example.com"
                    required
                    error={fieldErrors.email}
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField
                      label="姓"
                      name="last_name"
                      value={recruiterForm.last_name}
                      onChange={handleRecruiterFormChange}
                      placeholder="姓を入力"
                      required
                      error={fieldErrors.last_name}
                      disabled={isSubmitting}
                    />

                    <StudioFormField
                      label="名"
                      name="first_name"
                      value={recruiterForm.first_name}
                      onChange={handleRecruiterFormChange}
                      placeholder="名を入力"
                      required
                      error={fieldErrors.first_name}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField
                      label="姓（カナ）"
                      name="last_name_kana"
                      value={recruiterForm.last_name_kana}
                      onChange={handleRecruiterFormChange}
                      placeholder="セイを入力"
                      required
                      error={fieldErrors.last_name_kana}
                      disabled={isSubmitting}
                    />

                    <StudioFormField
                      label="名（カナ）"
                      name="first_name_kana"
                      value={recruiterForm.first_name_kana}
                      onChange={handleRecruiterFormChange}
                      placeholder="メイを入力"
                      required
                      error={fieldErrors.first_name_kana}
                      disabled={isSubmitting}
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    初期パスワード設定の案内メールが送信されます。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleCreateCompany}
                disabled={isSubmitting || Object.values(fieldErrors).some(Boolean)}
              >
                {isSubmitting ? "作成中..." : "作成"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

