"use client";

import React, { useState } from "react";
import { Users, LogIn, Plus, X } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import {
  getCompanyRecruiters,
  inviteRecruiterToCompany,
} from "@/lib/actions/company-account-actions";
import { proxyLoginAsRecruiter } from "@/lib/actions/proxy-login-actions";
import {
  validateRequired,
  validateEmail,
  validateKatakana,
} from "@jobtv-app/shared/utils/validation";
import type { Tables } from "@jobtv-app/shared/types";

type Profile = Tables<"profiles">;

interface RecruitersTabProps {
  companyId: string;
  recruiters: Profile[];
  onRecruitersUpdate: (recruiters: Profile[]) => void;
}

export default function RecruitersTab({ companyId, recruiters, onRecruitersUpdate }: RecruitersTabProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [proxyError, setProxyError] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
  });

  const [inviteFieldErrors, setInviteFieldErrors] = useState<{
    email?: string;
    last_name?: string;
    first_name?: string;
    last_name_kana?: string;
    first_name_kana?: string;
  }>({});

  const validateInviteField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "email":
        return validateEmail(value) || undefined;
      case "last_name":
      case "first_name":
        return validateRequired(value, name === "last_name" ? "姓" : "名") || undefined;
      case "last_name_kana":
      case "first_name_kana": {
        const requiredError = validateRequired(
          value,
          name === "last_name_kana" ? "姓（カナ）" : "名（カナ）"
        );
        if (requiredError) return requiredError;
        return (
          validateKatakana(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）") ||
          undefined
        );
      }
      default:
        return undefined;
    }
  };

  const handleOpenInviteModal = () => {
    setInviteForm({
      email: "",
      last_name: "",
      first_name: "",
      last_name_kana: "",
      first_name_kana: "",
    });
    setInviteFieldErrors({});
    setInviteError(null);
    setInviteSuccess(null);
    setIsInviteModalOpen(true);
  };

  const handleInviteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInviteForm((prev) => ({ ...prev, [name]: value }));
    const error = validateInviteField(name, value);
    setInviteFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInvite = async () => {
    const errors: typeof inviteFieldErrors = {};
    let hasError = false;

    for (const field of ["email", "last_name", "first_name", "last_name_kana", "first_name_kana"] as const) {
      const err = validateInviteField(field, inviteForm[field]);
      if (err) {
        errors[field] = err;
        hasError = true;
      }
    }

    if (hasError) {
      setInviteFieldErrors(errors);
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    const { data, error } = await inviteRecruiterToCompany(companyId, inviteForm);

    if (error) {
      setInviteError(error);
      setIsInviting(false);
      return;
    }

    if (data) {
      const { data: refreshedRecruiters } = await getCompanyRecruiters(companyId);
      if (refreshedRecruiters) onRecruitersUpdate(refreshedRecruiters);
      setInviteSuccess("招待メールを送信しました。");
      setIsInviteModalOpen(false);
    }
    setIsInviting(false);
  };

  return (
    <>
      {inviteSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-green-800">{inviteSuccess}</p>
        </div>
      )}

      {proxyError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-bold text-red-800">{proxyError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">リクルーターアカウント</h2>
            <span className="text-sm text-gray-500">（{recruiters.length}名）</span>
          </div>
          <StudioButton
            icon={<Plus className="w-4 h-4" />}
            size="sm"
            onClick={handleOpenInviteModal}
          >
            招待
          </StudioButton>
        </div>
        <div className="overflow-x-auto">
          {recruiters.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>リクルーターがいません</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">氏名</th>
                  <th className="px-6 py-4">メールアドレス</th>
                  <th className="px-6 py-4">登録日</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {recruiters.map((recruiter) => (
                  <tr key={recruiter.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {recruiter.last_name} {recruiter.first_name}
                      </span>
                      {(recruiter.last_name_kana || recruiter.first_name_kana) && (
                        <div className="text-xs text-gray-400">
                          {recruiter.last_name_kana} {recruiter.first_name_kana}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{recruiter.email || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {recruiter.created_at
                          ? new Date(recruiter.created_at).toLocaleDateString("ja-JP")
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<LogIn className="w-4 h-4" />}
                        onClick={async () => {
                          setProxyError(null);
                          const result = await proxyLoginAsRecruiter(recruiter.id);
                          if (result.error) {
                            setProxyError(result.error);
                          } else if (result.data?.redirectUrl) {
                            window.location.href = result.data.redirectUrl;
                          }
                        }}
                      >
                        代理ログイン
                      </StudioButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* リクルーター招待モーダル */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isInviting && setIsInviteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isInviting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">リクルーターを招待</h2>
              <p className="text-sm text-gray-600">
                初期パスワード設定の案内メールが送信されます。
              </p>
            </div>

            <div className="p-8 space-y-4">
              {inviteError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{inviteError}</p>
                </div>
              )}

              <StudioFormField
                label="メールアドレス"
                name="email"
                type="email"
                value={inviteForm.email}
                onChange={handleInviteFormChange}
                placeholder="recruiter@example.com"
                required
                error={inviteFieldErrors.email}
                disabled={isInviting}
              />

              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓"
                  name="last_name"
                  value={inviteForm.last_name}
                  onChange={handleInviteFormChange}
                  placeholder="姓を入力"
                  required
                  error={inviteFieldErrors.last_name}
                  disabled={isInviting}
                />
                <StudioFormField
                  label="名"
                  name="first_name"
                  value={inviteForm.first_name}
                  onChange={handleInviteFormChange}
                  placeholder="名を入力"
                  required
                  error={inviteFieldErrors.first_name}
                  disabled={isInviting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="姓（カナ）"
                  name="last_name_kana"
                  value={inviteForm.last_name_kana}
                  onChange={handleInviteFormChange}
                  placeholder="セイを入力"
                  required
                  error={inviteFieldErrors.last_name_kana}
                  disabled={isInviting}
                />
                <StudioFormField
                  label="名（カナ）"
                  name="first_name_kana"
                  value={inviteForm.first_name_kana}
                  onChange={handleInviteFormChange}
                  placeholder="メイを入力"
                  required
                  error={inviteFieldErrors.first_name_kana}
                  disabled={isInviting}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isInviting}
              >
                キャンセル
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? "招待中..." : "招待する"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
