"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Info } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import {
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
} from "@/lib/actions/email-template-actions";

// システムテンプレート名は name フィールドを readonly にする
const SYSTEM_TEMPLATE_NAMES = [
  "invite_recruiter",
  "invite_team_member",
  "signup_confirmation",
  "password_reset",
];

interface FormState {
  name: string;
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string; // カンマ区切りで入力
  is_active: boolean;
}

export default function AdminEmailTemplateEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    subject: "",
    body_html: "",
    body_text: "",
    variables: "",
    is_active: true,
  });

  useEffect(() => {
    if (isNew) return;
    const fetch = async () => {
      const { data, error } = await getEmailTemplate(params.id);
      if (error || !data) {
        setError(error ?? "テンプレートの取得に失敗しました");
        setLoading(false);
        return;
      }
      setForm({
        name:        data.name,
        description: data.description ?? "",
        subject:     data.subject,
        body_html:   data.body_html,
        body_text:   data.body_text ?? "",
        variables:   data.variables.join(", "),
        is_active:   data.is_active,
      });
      setLoading(false);
    };
    fetch();
  }, [isNew, params.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const variableList = form.variables
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (isNew) {
      const { data, error } = await createEmailTemplate({
        name:        form.name,
        description: form.description || undefined,
        subject:     form.subject,
        body_html:   form.body_html,
        body_text:   form.body_text || undefined,
        variables:   variableList,
        is_active:   form.is_active,
      });
      if (error) {
        setError(error);
      } else if (data) {
        router.push(`/admin/email/templates/${data.id}`);
      }
    } else {
      const { error } = await updateEmailTemplate(params.id, {
        description: form.description || undefined,
        subject:     form.subject,
        body_html:   form.body_html,
        body_text:   form.body_text || undefined,
        variables:   variableList,
        is_active:   form.is_active,
      });
      if (error) {
        setError(error);
      } else {
        setSuccessMessage("保存しました");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    }

    setSaving(false);
  };

  const isSystemTemplate = SYSTEM_TEMPLATE_NAMES.includes(form.name);
  const variableList = form.variables
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/email/templates")}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {isNew ? "テンプレートを新規作成" : "テンプレートを編集"}
          </h1>
          {form.name && <p className="text-gray-500 font-medium">{form.name}</p>}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* フォームカード */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-5">
          {/* テンプレート名 */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="name" required>テンプレート名</StudioLabel>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              readOnly={!isNew || isSystemTemplate}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 read-only:bg-gray-50"
              placeholder="invite_recruiter"
            />
            {isSystemTemplate && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" /> システムテンプレートのため名前は変更できません
              </p>
            )}
          </div>

          {/* 説明 */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="description">説明</StudioLabel>
            <input
              id="description"
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
              placeholder="管理者が企業を新規作成した際の招待メール"
            />
          </div>

          {/* 件名 */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="subject" required>件名</StudioLabel>
            <input
              id="subject"
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
              placeholder="【JobTV】{company_name} リクルーターアカウントのご案内"
            />
            <p className="text-xs text-gray-400">
              変数は <code className="bg-gray-100 px-1 rounded">{`{variable_name}`}</code> の形式で記述
            </p>
          </div>

          {/* 本文 HTML */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="body_html" required>本文 HTML</StudioLabel>
            <textarea
              id="body_html"
              name="body_html"
              value={form.body_html}
              onChange={handleChange}
              required
              rows={20}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-y"
              placeholder="<p>...</p>"
            />
          </div>

          {/* 本文 プレーンテキスト */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="body_text">本文 プレーンテキスト（任意）</StudioLabel>
            <textarea
              id="body_text"
              name="body_text"
              value={form.body_text}
              onChange={handleChange}
              rows={8}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-y"
              placeholder="HTML メールが表示できない場合に表示されます"
            />
          </div>

          {/* 変数 */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="variables">変数（カンマ区切り）</StudioLabel>
            <input
              id="variables"
              type="text"
              name="variables"
              value={form.variables}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
              placeholder="first_name, last_name, invite_url, site_url"
            />
            {variableList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {variableList.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600"
                  >
                    {`{${v}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 状態 */}
          <div className="space-y-1.5">
            <StudioLabel htmlFor="is_active">状態</StudioLabel>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="is_active"
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm">有効（メール送付に使用される）</span>
            </label>
          </div>

          {/* 保存ボタン */}
          <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
            <StudioButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => router.push("/admin/email/templates")}
            >
              キャンセル
            </StudioButton>
            <StudioButton
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              icon={<Save className="w-4 h-4" />}
            >
              {saving ? "保存中..." : "保存"}
            </StudioButton>
          </div>
        </div>
      </form>
    </div>
  );
}
