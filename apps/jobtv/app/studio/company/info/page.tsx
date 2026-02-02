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
import { useParams } from "next/navigation";

// 空の初期データ
const emptyCompanyData: Partial<CompanyData> = {
  id: "",
  name: "",
  logo: "",
  representative: "",
  established: "",
  capital: "",
  employees: "",
  website: ""
};

export default function CompanyInfoPage() {
  const params = useParams();
  const urlCompanyId = (params?.id as string) || "uid";

  const [company, setCompany] = useState<Partial<CompanyData>>(emptyCompanyData);
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 初期データを取得
  useEffect(() => {
    const fetchCompanyData = async () => {
      setIsLoading(true);

      try {
        const targetId = urlCompanyId === "uid" ? "" : urlCompanyId;
        const result = await getCompanyProfile(targetId || "uid");

        if (result.error) {
          console.error("Failed to fetch company data:", result.error);
          if (company.id === "" && company.name === "") {
            setCompany(emptyCompanyData);
            setCompanyId("");
          }
        } else if (result.data) {
          const companyData = dbToCompanyData(result.data);
          setCompany({
            id: companyData.id,
            name: companyData.name,
            logo: companyData.logo,
            representative: companyData.representative,
            established: companyData.established,
            capital: companyData.capital,
            employees: companyData.employees,
            website: companyData.website
          });
          setCompanyId(result.data.id);
        } else {
          if (company.id === "" && company.name === "") {
            setCompany(emptyCompanyData);
            setCompanyId("");
          }
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCompanyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompany((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    try {
      const formData = {
        // nameは編集不可のため、保存時に送信しない
        logo_url: company.logo,
        representative: company.representative,
        established: company.established,
        capital: company.capital,
        employees: company.employees,
        website: company.website
      };

      const result = await saveCompanyInfo(companyId, formData);

      if (result.error) {
        setSaveStatus("error");
        setErrorMessage(result.error);
      } else {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (field: "logo", url: string) => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">企業情報管理</h1>
          <p className="text-gray-500 font-medium">企業の基本情報を編集します。</p>
        </div>
        <StudioButton
          icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "変更を保存"}
        </StudioButton>
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
          {/* 基本情報 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">基本情報</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">会社名</label>
                <p className="text-base text-gray-900 font-medium">{company.name || "未設定"}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StudioFormField
                  label="代表者名"
                  name="representative"
                  value={company.representative || ""}
                  onChange={handleChange}
                />
                <StudioFormField
                  label="設立年月"
                  name="established"
                  value={company.established || ""}
                  onChange={handleChange}
                />
                <StudioFormField label="資本金" name="capital" value={company.capital || ""} onChange={handleChange} />
                <StudioFormField
                  label="従業員数"
                  name="employees"
                  value={company.employees || ""}
                  onChange={handleChange}
                />
              </div>
              <StudioFormField
                label="公式サイト"
                name="website"
                value={company.website || ""}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* ビジュアル管理 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-lg">企業ロゴ</h2>
            </div>
            <div className="p-6 space-y-8">
              <StudioImageUpload
                label="企業ロゴ"
                companyId={companyId}
                type="logo"
                currentUrl={company.logo}
                onUploadComplete={(url) => handleImageUpload("logo", url)}
                onError={(error) => {
                  setErrorMessage(error);
                  setSaveStatus("error");
                }}
                aspectRatio="square"
                helperText="400x400px 以上の正方形を推奨"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
