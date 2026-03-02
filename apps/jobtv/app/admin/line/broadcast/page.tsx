"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getLineBroadcastEligibleCount,
  sendLineBroadcast,
  type LineBroadcastFilters
} from "@/lib/actions/line-broadcast-actions";
import {
  getGraduationYears,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
  SCHOOL_TYPES,
  MAJOR_CATEGORIES
} from "@/constants/signup-options";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import { LineMessagePreview } from "@/components/admin/LineMessagePreview";

const LINE_TEXT_MAX_LENGTH = 5000;

export default function AdminLineBroadcastPage() {
  const [filters, setFilters] = useState<LineBroadcastFilters>({});
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  const refreshCount = useCallback(async () => {
    setCountLoading(true);
    setCountError(null);
    const result = await getLineBroadcastEligibleCount(filters);
    setCountLoading(false);
    if (result.error) {
      setCountError(result.error);
      setCount(null);
    } else {
      setCount(result.data);
      setCountError(null);
    }
  }, [filters]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) {
      setSendError("配信文を入力してください。");
      return;
    }
    setSendLoading(true);
    setSendError(null);
    setSendResult(null);
    const result = await sendLineBroadcast(filters, text);
    setSendLoading(false);
    if (result.error) {
      setSendError(result.error);
      return;
    }
    setSendResult(result.data);
    setMessageText("");
    refreshCount();
  };

  const graduationYears = getGraduationYears();

  return (
    <div className="relative pb-4">
      {/* メイン: プレビュー分の横幅を空ける（右下に固定プレビュー用） */}
      <div className="mr-0 min-w-0 md:mr-[336px]">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">LINE配信</h1>
          <p className="text-sm text-gray-600">
            セグメント条件に該当し、LINE連携済みの学生にメッセージを配信します。
          </p>

          <section className="rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">セグメント条件</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  卒年度（複数選択可）
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-white p-3">
                  {graduationYears.map((y) => (
                    <label
                      key={y}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={filters.graduation_years?.includes(y) ?? false}
                        onChange={(e) => {
                          const current = filters.graduation_years ?? [];
                          const next = e.target.checked
                            ? [...current, y].sort((a, b) => a - b)
                            : current.filter((n) => n !== y);
                          setFilters((prev) => ({
                            ...prev,
                            graduation_years: next.length ? next : undefined
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{y}年卒</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  学校種別
                </label>
                <StudioSelect
                  value={filters.school_type ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      school_type: e.target.value || undefined
                    }))
                  }
                >
                  <option value="">指定なし</option>
                  {SCHOOL_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </StudioSelect>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  文理
                </label>
                <StudioSelect
                  value={filters.major_field ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      major_field: e.target.value || undefined
                    }))
                  }
                >
                  <option value="">指定なし</option>
                  {MAJOR_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </StudioSelect>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                興味のある業界（複数選択可）
              </label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                <div className="flex flex-col gap-1">
                  {DESIRED_INDUSTRIES.map((i) => (
                    <label
                      key={i}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.desired_industries?.includes(i) ?? false}
                        onChange={(e) => {
                          const current = filters.desired_industries ?? [];
                          const next = e.target.checked
                            ? [...current, i]
                            : current.filter((v) => v !== i);
                          setFilters((prev) => ({
                            ...prev,
                            desired_industries: next.length ? next : undefined
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{i}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                興味のある職種（複数選択可）
              </label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                <div className="flex flex-col gap-1">
                  {DESIRED_JOB_TYPES.map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={filters.desired_job_types?.includes(t) ?? false}
                        onChange={(e) => {
                          const current = filters.desired_job_types ?? [];
                          const next = e.target.checked
                            ? [...current, t]
                            : current.filter((v) => v !== t);
                          setFilters((prev) => ({
                            ...prev,
                            desired_job_types: next.length ? next : undefined
                          }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-2">配信対象</h2>
            {countLoading ? (
              <LoadingSpinner />
            ) : countError ? (
              <ErrorMessage message={countError} />
            ) : (
              <p className="text-lg font-medium">
                配信対象: <span className="text-gray-700">{count ?? 0}</span> 人
              </p>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">配信文</h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                メッセージ（テキスト）
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm min-h-[120px] text-gray-900"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value.slice(0, LINE_TEXT_MAX_LENGTH))}
                placeholder="配信するメッセージを入力してください"
                maxLength={LINE_TEXT_MAX_LENGTH}
              />
              <p className="mt-1 text-xs text-gray-500">
                {messageText.length} / {LINE_TEXT_MAX_LENGTH} 文字
              </p>
            </div>

            {sendError && <ErrorMessage message={sendError} />}
            {sendResult && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                送信完了: 成功 {sendResult.sent} 件、失敗 {sendResult.failed} 件
              </div>
            )}

            <StudioButton
              onClick={handleSend}
              disabled={sendLoading || (count ?? 0) === 0 || !messageText.trim()}
            >
              {sendLoading ? "送信中..." : "配信する"}
            </StudioButton>
          </section>
        </div>
      </div>

      {/* 右下に追従する LINE プレビュー（幅 320px） */}
      <div className="fixed bottom-6 right-6 z-10 w-[320px] md:bottom-6 md:right-10">
        <LineMessagePreview messageText={messageText} />
      </div>
    </div>
  );
}
