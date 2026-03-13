"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Plus, X, Pencil, Check } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import EmptyState from "@/components/studio/atoms/EmptyState";
import {
  getAdminLpScrollBanners,
  createLpScrollBanner,
  updateLpScrollBanner,
  deleteLpScrollBanner
} from "@/lib/actions/lp-scroll-banner-actions";

type ScrollBanner = {
  id: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function BannerForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: { link_url: string; is_active: boolean };
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
      if (!initialValues) {
        formRef.current?.reset();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {formError && <ErrorMessage message={formError} />}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          遷移先URL <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="link_url"
          defaultValue={initialValues?.link_url ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          画像{!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required={!initialValues}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </div>
      {initialValues && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            value="true"
            defaultChecked={initialValues.is_active}
            id="is_active"
            className="rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">有効にする</label>
        </div>
      )}
      {!initialValues && <input type="hidden" name="is_active" value="true" />}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {initialValues ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {submitting ? "保存中..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

export default function LpScrollBannerContent() {
  const [banners, setBanners] = useState<ScrollBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<ScrollBanner | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLpScrollBanners();
      if (res.error) throw new Error(res.error);
      setBanners(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createLpScrollBanner(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchBanners();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingBanner) return;
    setActionError(null);
    const res = await updateLpScrollBanner(editingBanner.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingBanner(null);
    await fetchBanners();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteLpScrollBanner(id);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchBanners();
  };

  if (loading) {
    return <LoadingSpinner message="読み込み中..." />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">現在のスクロールバナー</h2>
          {banners.length === 0 ? (
            <EmptyState
              title="バナーがありません"
              description="右のフォームからバナーを追加してください"
            />
          ) : (
            <ul className="space-y-3">
              {banners.map((banner) => (
                <React.Fragment key={banner.id}>
                  <li className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                      <Image
                        src={banner.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-500">{banner.link_url}</p>
                      <span className={`inline-block mt-1 rounded px-1.5 py-0.5 text-xs font-medium ${
                        banner.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {banner.is_active ? "有効" : "無効"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBanner(banner)}
                      className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="編集"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(banner.id)}
                      className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="削除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                  {editingBanner?.id === banner.id && (
                    <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="mb-3 text-sm font-medium text-blue-800">バナーを編集</p>
                      <BannerForm
                        initialValues={{
                          link_url: editingBanner.link_url,
                          is_active: editingBanner.is_active
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingBanner(null)}
                        submitLabel="更新する"
                      />
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規バナーを追加</h2>
          <BannerForm onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
