"use client";

import React, { useState } from "react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import {
  getCompanyById,
  updateCompany,
} from "@/lib/actions/company-account-actions";
import {
  validateRequired,
  validateMaxLength,
  validateUrlWithProtocol,
} from "@jobtv-app/shared/utils/validation";
import { REPRESENTATIVE_NAME_MAX_LENGTH, COMPANY_INFO_MAX_LENGTH } from "@/constants/validation";
import type { Tables } from "@jobtv-app/shared/types";
import {
  generateIndustryOptions,
  generateYearOptions,
  generateMonthOptions,
  generateEmployeesRangeOptions,
} from "@/constants/company-options";

type Company = Tables<"companies">;

interface CompanyInfoTabProps {
  company: Company;
  onCompanyUpdate: (company: Company) => void;
}

export default function CompanyInfoTab({ company, onCompanyUpdate }: CompanyInfoTabProps) {
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const formatEstablishedDate = (year: string, month: string): string => {
    if (!year || !month) return "";
    return `${year}年${parseInt(month)}月`;
  };

  const initialParsed = company.established ? parseEstablishedDate(company.established) : null;

  const [companyForm, setCompanyForm] = useState({
    name: company.name || "",
    industry: company.industry || "",
    prefecture: company.prefecture || "",
    address_line1: company.address_line1 || "",
    address_line2: company.address_line2 || "",
    website: company.website || "",
    representative: company.representative || "",
    established: company.established || "",
    employees: company.employees || "",
    company_info: company.company_info || "",
    status: (company.status as "active" | "closed") || "active",
  });

  const [establishedYear, setEstablishedYear] = useState<string>(initialParsed?.year || "");
  const [establishedMonth, setEstablishedMonth] = useState<string>(initialParsed?.month || "");

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
    _general?: string;
  }>({});

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
      default:
        return undefined;
    }
  };

  const handleCompanyFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setEstablishedYear(year);
    const newEstablished =
      year && establishedMonth ? formatEstablishedDate(year, establishedMonth) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
  };

  const handleEstablishedMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setEstablishedMonth(month);
    const newEstablished =
      establishedYear && month ? formatEstablishedDate(establishedYear, month) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
  };

  const handleEmployeesRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setCompanyForm((prev) => ({ ...prev, employees: range }));
  };

  const handleSave = async () => {
    const errors: typeof fieldErrors = {};
    let hasError = false;

    const fields = [
      "name",
      "established",
      "representative",
      "employees",
      "website",
      "company_info",
      "industry",
      "prefecture",
      "address_line1",
    ] as const;

    for (const field of fields) {
      const err = validateField(field, companyForm[field as keyof typeof companyForm]);
      if (err) {
        errors[field] = err;
        hasError = true;
      }
    }

    if (hasError) {
      setFieldErrors({ ...errors, _general: "入力内容に誤りがあります。" });
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    setFieldErrors({});

    const { error } = await updateCompany(company.id, {
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
    });

    if (error) {
      setSaveError(error);
    } else {
      setSaveSuccess(true);
      const { data: refreshed } = await getCompanyById(company.id);
      if (refreshed) onCompanyUpdate(refreshed);
    }
    setSaveLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">企業情報</h2>
      </div>
      <div className="p-6 space-y-6">
        {fieldErrors._general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-bold text-red-800">{fieldErrors._general}</p>
          </div>
        )}
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-bold text-green-800">企業情報を保存しました。</p>
          </div>
        )}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-bold text-red-800">{saveError}</p>
          </div>
        )}

        <StudioFormField
          label="企業名"
          name="name"
          value={companyForm.name}
          onChange={handleCompanyFormChange}
          placeholder="企業名を入力"
          required
          error={fieldErrors.name}
          disabled={saveLoading}
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
                disabled={saveLoading}
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
                disabled={saveLoading}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StudioFormField
            label="代表者名"
            name="representative"
            value={companyForm.representative}
            onChange={handleCompanyFormChange}
            placeholder="代表者名を入力"
            required
            error={fieldErrors.representative}
            disabled={saveLoading}
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
              disabled={saveLoading}
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

        <StudioFormField
          label="公式サイト"
          name="website"
          value={companyForm.website}
          onChange={handleCompanyFormChange}
          placeholder="https://example.com"
          required
          error={fieldErrors.website}
          disabled={saveLoading}
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
          disabled={saveLoading}
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
            disabled={saveLoading}
          >
            {generateIndustryOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StudioSelect>
          {fieldErrors.industry && (
            <p className="text-[10px] text-red-500 font-bold">{fieldErrors.industry}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PrefectureSelect
            value={companyForm.prefecture}
            onChange={(e) => setCompanyForm({ ...companyForm, prefecture: e.target.value })}
            error={fieldErrors.prefecture}
            disabled={saveLoading}
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
            disabled={saveLoading}
          />
        </div>

        <StudioFormField
          label="ビル名・部屋番号"
          name="address_line2"
          value={companyForm.address_line2}
          onChange={handleCompanyFormChange}
          placeholder="例: サンプルビル5階"
          error={fieldErrors.address_line2}
          disabled={saveLoading}
        />

        <div className="space-y-2">
          <StudioLabel htmlFor="status">ステータス</StudioLabel>
          <StudioSelect
            id="status"
            name="status"
            value={companyForm.status}
            onChange={handleCompanyFormChange}
            disabled={saveLoading}
          >
            <option value="active">有効</option>
            <option value="closed">無効</option>
          </StudioSelect>
        </div>

        <div className="flex justify-end">
          <StudioButton
            variant="primary"
            onClick={handleSave}
            disabled={saveLoading}
          >
            {saveLoading ? "保存中..." : "保存"}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
