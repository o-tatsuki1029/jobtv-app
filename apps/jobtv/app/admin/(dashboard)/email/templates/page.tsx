"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import Tabs from "@/components/studio/molecules/Tabs";
import { getEmailTemplates } from "@/lib/actions/email-template-actions";

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

const TEMPLATE_CATEGORIES: Record<string, { label: string; names: string[] | null }> = {
  all:          { label: "すべて", names: null },
  auth:         { label: "認証", names: ["signup_confirmation", "password_reset"] },
  invite:       { label: "招待", names: ["invite_recruiter", "invite_team_member", "invite_student"] },
  notification: { label: "通知", names: ["job_application_notification", "session_reservation_notification", "candidate_welcome"] },
  event:        { label: "イベント", names: ["event_reservation_confirmation", "event_reservation_reminder_7d", "event_reservation_reminder_3d", "event_reservation_reminder_1d"] },
};

export default function AdminEmailTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

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

  const filteredTemplates = useMemo(() => {
    const category = TEMPLATE_CATEGORIES[activeTab];
    if (!category || !category.names) return templates;
    return templates.filter((t) => category.names!.includes(t.name));
  }, [templates, activeTab]);

  const tabs = useMemo(() => {
    return Object.entries(TEMPLATE_CATEGORIES).map(([id, { label, names }]) => ({
      id,
      label,
      count: names ? templates.filter((t) => names.includes(t.name)).length : templates.length,
      color: "black" as const,
    }));
  }, [templates]);

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
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

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
                  <th className="px-6 py-4">更新日時</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>テンプレートがありません</p>
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template) => (
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
