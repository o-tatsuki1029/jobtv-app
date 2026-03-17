"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import {
  getLineMessageTemplates,
  deleteLineMessageTemplate,
} from "@/lib/actions/line-template-actions";

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  bubble: "カード",
  carousel: "カルーセル",
  image: "画像",
  imagemap: "イメージマップ",
};

const MESSAGE_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-800",
  bubble: "bg-purple-100 text-purple-800",
  carousel: "bg-orange-100 text-orange-800",
  image: "bg-green-100 text-green-800",
  imagemap: "bg-pink-100 text-pink-800",
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  message_type: string;
  updated_at: string | null;
  created_at: string;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

export default function AdminLineTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getLineMessageTemplates();
    if (fetchError) {
      setError(fetchError);
    } else {
      setTemplates((data ?? []) as Template[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除しますか？`)) return;

    setDeleting(id);
    const { error: deleteError } = await deleteLineMessageTemplate(id);
    if (deleteError) {
      setError(deleteError);
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
    setDeleting(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-green-600" />
          <h1 className="text-3xl font-black tracking-tight">
            LINEテンプレート
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StudioButton
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadTemplates}
          >
            更新
          </StudioButton>
          <StudioButton
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push("/admin/line/broadcast")}
          >
            新規作成
          </StudioButton>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Templates Table */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mb-4" />
          <p className="text-lg font-bold">テンプレートがありません</p>
          <p className="text-sm mt-1">
            配信画面からテンプレートを作成できます
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-bold text-gray-600">
                  テンプレート名
                </th>
                <th className="text-left px-6 py-3 font-bold text-gray-600">
                  タイプ
                </th>
                <th className="text-left px-6 py-3 font-bold text-gray-600">
                  説明
                </th>
                <th className="text-left px-6 py-3 font-bold text-gray-600">
                  更新日
                </th>
                <th className="text-right px-6 py-3 font-bold text-gray-600">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {template.name}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        MESSAGE_TYPE_COLORS[template.message_type] ??
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {MESSAGE_TYPE_LABELS[template.message_type] ??
                        template.message_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                    {template.description ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {formatDate(template.updated_at ?? template.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/line/broadcast?templateId=${template.id}`
                          )
                        }
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="編集"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(template.id, template.name)
                        }
                        disabled={deleting === template.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
