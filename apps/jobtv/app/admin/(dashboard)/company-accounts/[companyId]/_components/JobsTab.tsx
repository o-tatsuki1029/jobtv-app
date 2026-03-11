"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Pencil } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import {
  adminGetJobsForCompany,
  adminSaveJob,
  adminUploadJobCoverImage,
  adminToggleJobStatus,
} from "@/lib/actions/admin-company-detail-actions";

interface JobsTabProps {
  companyId: string;
}

const EMPLOYMENT_TYPES = [
  { value: "", label: "選択してください" },
  { value: "正社員", label: "正社員" },
  { value: "契約社員", label: "契約社員" },
  { value: "業務委託", label: "業務委託" },
  { value: "インターン", label: "インターン" },
];

export default function JobsTab({ companyId }: JobsTabProps) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    employment_type: "",
    graduation_year: "",
    prefecture: "",
    location_detail: "",
    description: "",
    requirements: "",
    benefits: "",
    selection_process: "",
    cover_image_url: "",
  });

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await adminGetJobsForCompany(companyId);
    if (data) setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, [companyId]);

  const openCreateModal = () => {
    setEditingJob(null);
    setForm({
      title: "",
      employment_type: "",
      graduation_year: "",
      prefecture: "",
      location_detail: "",
      description: "",
      requirements: "",
      benefits: "",
      selection_process: "",
      cover_image_url: "",
    });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: any) => {
    setEditingJob(job);
    setForm({
      title: job.title || "",
      employment_type: job.employment_type || "",
      graduation_year: job.graduation_year?.toString() || "",
      prefecture: job.prefecture || "",
      location_detail: job.location_detail || "",
      description: job.description || "",
      requirements: job.requirements || "",
      benefits: job.benefits || "",
      selection_process: job.selection_process || "",
      cover_image_url: job.cover_image_url || "",
    });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setSaveError("タイトルは必須です");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const { error } = await adminSaveJob(
      companyId,
      editingJob?.id || null,
      {
        title: form.title,
        employment_type: form.employment_type || null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        prefecture: form.prefecture || null,
        location_detail: form.location_detail || null,
        description: form.description || null,
        requirements: form.requirements || null,
        benefits: form.benefits || null,
        selection_process: form.selection_process || null,
        cover_image_url: form.cover_image_url || null,
      }
    );

    if (error) {
      setSaveError(error);
    } else {
      setIsModalOpen(false);
      await loadJobs();
    }
    setSaving(false);
  };

  const handleToggleStatus = async (job: any) => {
    if (!job.production_job_id) return;
    const newStatus = job.production_status === "active" ? "closed" : "active";
    await adminToggleJobStatus(job.production_job_id, newStatus);
    await loadJobs();
  };

  const getStatusBadge = (job: any) => {
    if (job.production_status === "active") return <StudioBadge variant="success">公開中</StudioBadge>;
    if (job.production_job_id) return <StudioBadge variant="neutral">非公開</StudioBadge>;
    return <StudioBadge variant="warning">{job.draft_status === "submitted" ? "審査中" : "下書き"}</StudioBadge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">求人一覧（{jobs.length}件）</h2>
          <StudioButton icon={<Plus className="w-4 h-4" />} size="sm" onClick={openCreateModal}>
            新規求人
          </StudioButton>
        </div>
        <div className="overflow-x-auto">
          {jobs.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>求人がありません</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">タイトル</th>
                  <th className="px-6 py-4">雇用形態</th>
                  <th className="px-6 py-4">卒業年度</th>
                  <th className="px-6 py-4">勤務地</th>
                  <th className="px-6 py-4">ステータス</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{job.title || "無題"}</td>
                    <td className="px-6 py-4 text-gray-600">{job.employment_type || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{job.graduation_year ? `${job.graduation_year}年卒` : "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{job.prefecture || "-"}</td>
                    <td className="px-6 py-4">{getStatusBadge(job)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StudioButton
                          variant="outline"
                          size="sm"
                          icon={<Pencil className="w-3 h-3" />}
                          onClick={() => openEditModal(job)}
                        >
                          編集
                        </StudioButton>
                        {job.production_job_id && (
                          <StudioButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(job)}
                          >
                            {job.production_status === "active" ? "非公開" : "公開"}
                          </StudioButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 求人編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !saving && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingJob ? "求人を編集" : "新規求人"}
              </h2>
            </div>

            <div className="p-8 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{saveError}</p>
                </div>
              )}

              <StudioFormField
                label="タイトル"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="求人タイトル（32字以内）"
                maxLength={32}
                showCharCount
                required
                disabled={saving}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <StudioLabel htmlFor="employment_type">雇用形態</StudioLabel>
                  <StudioSelect
                    id="employment_type"
                    value={form.employment_type}
                    onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                    disabled={saving}
                  >
                    {EMPLOYMENT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </StudioSelect>
                </div>
                <StudioFormField
                  label="卒業年度"
                  name="graduation_year"
                  value={form.graduation_year}
                  onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                  placeholder="例: 2027"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PrefectureSelect
                  value={form.prefecture}
                  onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
                  disabled={saving}
                />
                <StudioFormField
                  label="勤務地詳細"
                  name="location_detail"
                  value={form.location_detail}
                  onChange={(e) => setForm({ ...form, location_detail: e.target.value })}
                  placeholder="例: 渋谷オフィス"
                  maxLength={32}
                  disabled={saving}
                />
              </div>

              <StudioFormField
                label="仕事内容"
                name="description"
                type="textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                maxLength={3000}
                showCharCount
                disabled={saving}
              />

              <StudioFormField
                label="応募要件"
                name="requirements"
                type="textarea"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={4}
                maxLength={3000}
                showCharCount
                disabled={saving}
              />

              <StudioFormField
                label="待遇・福利厚生"
                name="benefits"
                type="textarea"
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                rows={4}
                maxLength={3000}
                showCharCount
                disabled={saving}
              />

              <StudioFormField
                label="選考プロセス"
                name="selection_process"
                type="textarea"
                value={form.selection_process}
                onChange={(e) => setForm({ ...form, selection_process: e.target.value })}
                rows={4}
                maxLength={3000}
                showCharCount
                disabled={saving}
              />

              <StudioImageUpload
                label="カバー画像"
                type="cover"
                currentUrl={form.cover_image_url}
                onUploadComplete={(url) => setForm({ ...form, cover_image_url: url })}
                aspectRatio="video"
                customUploadFunction={(file) => adminUploadJobCoverImage(companyId, file)}
                disabled={saving}
              />
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
