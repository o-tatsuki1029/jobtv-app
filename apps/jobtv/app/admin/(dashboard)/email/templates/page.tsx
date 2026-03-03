"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import {
  getEmailTemplates,
  updateEmailTemplate,
} from "@/lib/actions/email-template-actions";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminEmailTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await getEmailTemplates();
    if (error || !data) {
      setError(error ?? "テンプレートの取得に失敗しました");
    } else {
      setTemplates(data as EmailTemplate[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleActive = async (template: EmailTemplate) => {
    setTogglingId(template.id);
    const { error } = await updateEmailTemplate(template.id, {
      is_active: !template.is_active,
    });
    if (error) {
      setError(error);
    } else {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, is_active: !t.is_active } : t
        )
      );
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Mail className="w-8 h-8" />
            メールテンプレート管理
          </h1>
          <p className="text-gray-500 font-medium">SendGrid で送付するメールのテンプレートを管理します</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudioButton
            variant="outline"
            onClick={() => router.push("/admin/email/logs")}
          >
            送付ログを見る
          </StudioButton>
          <StudioButton
            variant="primary"
            onClick={() => router.push("/admin/email/templates/new")}
            icon={<Plus className="w-4 h-4" />}
          >
            新規テンプレート
          </StudioButton>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">テンプレート名</th>
                  <th className="px-6 py-4">件名</th>
                  <th className="px-6 py-4">変数</th>
                  <th className="px-6 py-4">状態</th>
                  <th className="px-6 py-4">更新日時</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>テンプレートがありません</p>
                      <p className="text-xs mt-1">新規テンプレートを作成してください</p>
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {template.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-700">
                        {template.subject}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((v) => (
                            <span
                              key={v}
                              className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600"
                            >
                              {`{${v}}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StudioBadge
                          variant={template.is_active ? "success" : "neutral"}
                        >
                          {template.is_active ? "有効" : "無効"}
                        </StudioBadge>
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(template.updated_at).toLocaleString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StudioButton
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/email/templates/${template.id}`)
                            }
                            icon={<Pencil className="w-3.5 h-3.5" />}
                          >
                            編集
                          </StudioButton>
                          <button
                            onClick={() => handleToggleActive(template)}
                            disabled={togglingId === template.id}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            title={template.is_active ? "無効にする" : "有効にする"}
                          >
                            {template.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
