"use client";

import React from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import type { CompanyData } from "@/components/company";
import StudioButton from "../atoms/StudioButton";
import StudioFormField from "./StudioFormField";
import SectionCard from "./SectionCard";

interface StudioBenefitsSectionProps {
  company: CompanyData;
  setCompany: React.Dispatch<React.SetStateAction<CompanyData>>;
  setErrorMessage: (message: string) => void;
  setSaveStatus: (status: "idle" | "success" | "error") => void;
}

const MAX_BENEFITS = 6;

export default function StudioBenefitsSection({
  company,
  setCompany,
  setErrorMessage,
  setSaveStatus
}: StudioBenefitsSectionProps) {
  const addBenefit = () => {
    if ((company.benefits || []).length >= MAX_BENEFITS) {
      setErrorMessage("福利厚生・制度は最大6個まで登録できます");
      setSaveStatus("error");
      return;
    }
    setCompany((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), ""]
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...company.benefits];
    newBenefits[index] = value;
    setCompany((prev) => ({ ...prev, benefits: newBenefits }));
  };

  const removeBenefit = (index: number) => {
    const newBenefits = company.benefits.filter((_, i) => i !== index);
    setCompany((prev) => ({ ...prev, benefits: newBenefits }));
  };

  return (
    <SectionCard icon={<Gift className="w-5 h-5 text-gray-400" />} title="福利厚生・制度">
      <div className="p-8 space-y-4">
        <div className="flex items-center justify-end">
          <StudioButton
            variant="outline"
            icon={<Plus className="w-4 h-4" />}
            onClick={addBenefit}
            className="text-xs"
            disabled={(company.benefits || []).length >= MAX_BENEFITS}
          >
            項目を追加
          </StudioButton>
        </div>
        {(company.benefits || []).length >= MAX_BENEFITS && (
          <p className="text-[10px] text-gray-400">福利厚生・制度は最大6個まで登録できます</p>
        )}
        {company.benefits && company.benefits.length > 0 ? (
          <div className="space-y-3">
            {company.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <StudioFormField
                    label={`福利厚生・制度を入力(${index + 1}/${MAX_BENEFITS})`}
                    name={`benefit-${index}`}
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeBenefit(index)}
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
    </SectionCard>
  );
}
