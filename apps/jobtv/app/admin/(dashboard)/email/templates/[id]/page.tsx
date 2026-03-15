"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import {
  getEmailTemplate,
  updateEmailTemplate,
} from "@/lib/actions/email-template-actions";

interface FormState {
  name: string;
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
}

export default function AdminEmailTemplateEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  // 新規作成は廃止 → 一覧にリダイレクト
  useEffect(() => {
    if (params.id === "new") {
      router.replace("/admin/email/templates");
    }
  }, [params.id, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    subject: "",
    body_html: "",
    body_text: "",
  });

  useEffect(() => {
    if (params.id === "new") return;
    const fetchTemplate = async () => {
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
      });
      setLoading(false);
    };
    fetchTemplate();
  }, [params.id]);

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

    const { error } = await updateEmailTemplate(params.id, {
      description: form.description || undefined,
      subject:     form.subject,
      body_html:   form.body_html,
      body_text:   form.body_text || undefined,
    });
    if (error) {
      setError(error);
    } else {
      setSuccessMessage("保存しました");
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setSaving(false);
  };

  if (params.id === "new") return null;
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
            テンプレートを編集
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
              readOnly
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none read-only:bg-gray-50"
            />
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
              placeholder="【JOBTV】{company_name} リクルーターアカウントのご案内"
            />
            <p className="text-xs text-gray-400">
              変数は <code className="bg-gray-100 px-1 rounded">{`{variable_name}`}</code> の形式で記述
            </p>
          </div>

          {/* 本文 HTML - CodeMirror + プレビュー */}
          <div className="space-y-1.5">
            <StudioLabel required>本文 HTML</StudioLabel>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <CodeMirror
                  value={form.body_html}
                  height="500px"
                  extensions={[html()]}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, body_html: value }))
                  }
                />
              </div>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-300 text-xs font-bold text-gray-500">
                  プレビュー
                </div>
                <iframe
                  srcDoc={form.body_html}
                  className="w-full bg-white"
                  style={{ height: "500px" }}
                  sandbox=""
                  title="HTMLプレビュー"
                />
              </div>
            </div>
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
