"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, X, Search, FileUp } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import { getStudents, createStudent } from "@/lib/actions/student-account-actions";
import { createStudentsFromCsv } from "@/lib/actions/student-csv-import";
import { downloadCSV } from "@/lib/utils/csv";
import { validateRequired, validateEmail, validateKatakana, validatePhone } from "@jobtv-app/shared/utils/validation";
import {
  GENDERS,
  SCHOOL_TYPES,
  MAJOR_CATEGORIES,
  getGraduationYears,
  getGraduationYearLabel,
  getBirthYears,
  BIRTH_MONTHS,
  getBirthDays,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
  formatDateOfBirth,
} from "@/constants/signup-options";

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export default function AdminStudentAccountsPage() {
  const [students, setStudents] = useState<{
    id: string;
    email: string | null;
    last_name: string | null;
    first_name: string | null;
    graduation_year: number | null;
    school_name: string | null;
    phone: string | null;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [csvFatalError, setCsvFatalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"created_at_desc" | "created_at_asc">("created_at_desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // --- フォーム ---
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const [form, setForm] = useState({
    email: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    gender: "",
    birth_year: "",
    birth_month: "",
    birth_day: "",
    phone: "",
    school_type: "",
    school_name: "",
    faculty_name: "",
    department_name: "",
    major_field: "",
    graduation_year: "",
    desired_work_location: "",
    referrer: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
  });
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);

  const resetForm = () => {
    setForm({
      email: "", last_name: "", first_name: "", last_name_kana: "", first_name_kana: "",
      gender: "", birth_year: "", birth_month: "", birth_day: "", phone: "",
      school_type: "", school_name: "", faculty_name: "", department_name: "",
      major_field: "", graduation_year: "", desired_work_location: "",
      referrer: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "",
    });
    setSelectedIndustries([]);
    setSelectedJobTypes([]);
  };

  const loadStudents = async (currentPage = page) => {
    setLoading(true);
    setError(null);
    const { data, count, error: fetchError } = await getStudents({
      limit: pageSize,
      offset: currentPage * pageSize,
      search: debouncedSearch || undefined,
      sortBy,
    });
    if (fetchError) {
      setError(fetchError);
    } else {
      setStudents(data || []);
      setTotalCount(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sortBy, pageSize]);

  useEffect(() => {
    loadStudents(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, sortBy, pageSize]);

  const handleOpenCreateModal = () => {
    resetForm();
    setSuccessMessage(null);
    setError(null);
    setFieldErrors({});
    setIsSubmitting(false);
    setIsCreateModalOpen(true);
  };

  const handleOpenCsvModal = () => {
    setCsvFile(null);
    setCsvResult(null);
    setCsvFatalError(null);
    setIsCsvModalOpen(true);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      "メールアドレス", "姓", "名", "姓カナ", "名カナ",
      "性別", "生年月日", "電話番号",
      "学校種別", "学校名", "学部名", "学科名", "文理区分",
      "卒業年度", "希望勤務地",
      "興味のある業界", "興味のある職種",
      "流入元", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    ];
    const sample = [
      "student@example.com", "山田", "太郎", "ヤマダ", "タロウ",
      "男性", "2003-04-01", "09012345678",
      "大学", "東京大学", "工学部", "情報工学科", "理系",
      "2027", "東京都",
      "IT・通信;コンサルティング", "開発・エンジニア",
      "", "", "", "", "", "",
    ];
    downloadCSV(headers, [sample], "student-accounts-template");
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvSubmitting(true);
    setCsvResult(null);
    setCsvFatalError(null);
    const formData = new FormData();
    formData.append("file", csvFile);
    try {
      const { data, error } = await createStudentsFromCsv(formData);
      if (error) {
        setCsvFatalError(error);
        return;
      }
      if (data) {
        setCsvResult(data);
        if (data.created > 0) setPage(0);
      }
    } catch {
      setCsvFatalError("取り込み中にエラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setCsvSubmitting(false);
    }
  };

  // --- バリデーション ---
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "email":
        return validateEmail(value) || undefined;
      case "last_name":
      case "first_name":
        return validateRequired(value, name === "last_name" ? "姓" : "名") || undefined;
      case "last_name_kana":
      case "first_name_kana": {
        const req = validateRequired(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）");
        if (req) return req;
        return validateKatakana(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）") || undefined;
      }
      case "phone":
        if (!value) return undefined;
        return validatePhone(value) || undefined;
      default:
        return undefined;
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const toggleIndustry = (v: string) => {
    setSelectedIndustries((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };
  const toggleJobType = (v: string) => {
    setSelectedJobTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const handleCreateStudent = async () => {
    const errors: Record<string, string | undefined> = {};
    let hasError = false;

    for (const field of ["email", "last_name", "first_name", "last_name_kana", "first_name_kana", "phone"] as const) {
      const err = validateField(field, form[field]);
      if (err) { errors[field] = err; hasError = true; }
    }

    if (hasError) {
      setFieldErrors({ ...errors, _general: "入力内容に誤りがあります。各フィールドのエラーを確認してください。" });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    // 生年月日組み立て
    const dateOfBirth = form.birth_year && form.birth_month && form.birth_day
      ? formatDateOfBirth(Number(form.birth_year), Number(form.birth_month), Number(form.birth_day))
      : null;

    const { data, error: createError } = await createStudent({
      email: form.email,
      last_name: form.last_name,
      first_name: form.first_name,
      last_name_kana: form.last_name_kana,
      first_name_kana: form.first_name_kana,
      gender: form.gender || null,
      date_of_birth: dateOfBirth,
      phone: form.phone || null,
      school_type: form.school_type || null,
      school_name: form.school_name || null,
      faculty_name: form.faculty_name || null,
      department_name: form.department_name || null,
      major_field: form.major_field || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      desired_work_location: form.desired_work_location || null,
      desired_industry: selectedIndustries.length > 0 ? selectedIndustries : null,
      desired_job_type: selectedJobTypes.length > 0 ? selectedJobTypes : null,
      referrer: form.referrer || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
    });

    if (createError) {
      setIsSubmitting(false);
      setFieldErrors((prev) => ({ ...prev, _general: createError }));
      return;
    }

    if (data) {
      setSuccessMessage("学生アカウントを作成しました。初期パスワード設定の案内メールを送信しました。");
      setIsCreateModalOpen(false);
      setPage(0);
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const isInitialLoading = loading && totalCount === null;
  if (isInitialLoading) return <LoadingSpinner />;

  const birthDays = form.birth_year && form.birth_month
    ? getBirthDays(Number(form.birth_year), Number(form.birth_month))
    : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-10">
      <ErrorMessage message={error || ""} />
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8" />
            学生アカウント管理
          </h1>
          <p className="text-gray-500 font-medium">学生アカウントを管理できます。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudioButton variant="outline" icon={<FileUp className="w-4 h-4" />} onClick={handleOpenCsvModal}>
            CSVで学生を登録
          </StudioButton>
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            新規学生を作成
          </StudioButton>
        </div>
      </div>

      {/* 検索とソート */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前またはメールで検索"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-gray-900"
          />
        </div>
        {(students.length > 0 || totalCount !== null) && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-gray-700">並び順:</label>
            <StudioSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as "created_at_desc" | "created_at_asc")}>
              <option value="created_at_desc">登録日（新しい順）</option>
              <option value="created_at_asc">登録日（古い順）</option>
            </StudioSelect>
          </div>
        )}
      </div>

      {/* ページネーション（上） */}
      {(students.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemCount={students.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS} onPageChange={setPage} onPageSizeChange={(n) => setPageSize(n as PageSizeOption)} unit="人" />
      )}

      {/* テーブル */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">メール</th>
                <th className="px-6 py-4">氏名</th>
                <th className="px-6 py-4">電話番号</th>
                <th className="px-6 py-4">卒業年度</th>
                <th className="px-6 py-4">学校名</th>
                <th className="px-6 py-4">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>{searchQuery ? "検索結果が見つかりませんでした" : "学生がいません"}</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{s.email || "-"}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {s.last_name && s.first_name ? `${s.last_name} ${s.first_name}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{s.phone || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{s.graduation_year ? `${s.graduation_year}年` : "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{s.school_name || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(s.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション（下） */}
      {(students.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar page={page} pageSize={pageSize} totalCount={totalCount} itemCount={students.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS} onPageChange={setPage} onPageSizeChange={(n) => setPageSize(n as PageSizeOption)} unit="人" />
      )}

      {/* ========== 新規作成モーダル ========== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">新規学生を作成</h2>
              <p className="text-sm text-gray-600">学生アカウントを作成します。必須項目以外は空欄でも登録できます。</p>
            </div>

            <div className="p-8 space-y-6">
              {fieldErrors._general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{fieldErrors._general}</p>
                </div>
              )}

              {/* === 必須項目 === */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">アカウント情報</h3>
                <div className="space-y-4">
                  <StudioFormField label="メールアドレス" name="email" type="email" value={form.email}
                    onChange={handleFormChange} placeholder="student@example.com" required error={fieldErrors.email} disabled={isSubmitting} />

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField label="姓" name="last_name" value={form.last_name}
                      onChange={handleFormChange} placeholder="姓を入力" required error={fieldErrors.last_name} disabled={isSubmitting} />
                    <StudioFormField label="名" name="first_name" value={form.first_name}
                      onChange={handleFormChange} placeholder="名を入力" required error={fieldErrors.first_name} disabled={isSubmitting} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField label="姓（カナ）" name="last_name_kana" value={form.last_name_kana}
                      onChange={handleFormChange} placeholder="セイを入力" required error={fieldErrors.last_name_kana} disabled={isSubmitting} />
                    <StudioFormField label="名（カナ）" name="first_name_kana" value={form.first_name_kana}
                      onChange={handleFormChange} placeholder="メイを入力" required error={fieldErrors.first_name_kana} disabled={isSubmitting} />
                  </div>
                </div>
              </div>

              {/* === 基本情報 === */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">基本情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <StudioLabel htmlFor="gender">性別</StudioLabel>
                      <StudioSelect id="gender" name="gender" value={form.gender} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">選択しない</option>
                        {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </StudioSelect>
                    </div>
                    <StudioFormField label="電話番号（ハイフンなし）" name="phone" value={form.phone}
                      onChange={handleFormChange} placeholder="09012345678" error={fieldErrors.phone} disabled={isSubmitting} />
                  </div>

                  {/* 生年月日 */}
                  <div className="space-y-2">
                    <StudioLabel>生年月日</StudioLabel>
                    <div className="grid grid-cols-3 gap-3">
                      <StudioSelect name="birth_year" value={form.birth_year} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">年</option>
                        {getBirthYears().map((y) => <option key={y} value={y.toString()}>{y}年</option>)}
                      </StudioSelect>
                      <StudioSelect name="birth_month" value={form.birth_month} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">月</option>
                        {BIRTH_MONTHS.map((m) => <option key={m} value={m.toString()}>{m}月</option>)}
                      </StudioSelect>
                      <StudioSelect name="birth_day" value={form.birth_day} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">日</option>
                        {birthDays.map((d) => <option key={d} value={d.toString()}>{d}日</option>)}
                      </StudioSelect>
                    </div>
                  </div>

                  <PrefectureSelect label="希望勤務地" value={form.desired_work_location}
                    onChange={(e) => setForm((prev) => ({ ...prev, desired_work_location: e.target.value }))}
                    disabled={isSubmitting} />
                </div>
              </div>

              {/* === 学校情報 === */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">学校情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <StudioLabel htmlFor="school_type">学校種別</StudioLabel>
                      <StudioSelect id="school_type" name="school_type" value={form.school_type} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">選択しない</option>
                        {SCHOOL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </StudioSelect>
                    </div>
                    <div className="space-y-2">
                      <StudioLabel htmlFor="graduation_year">卒業年度</StudioLabel>
                      <StudioSelect id="graduation_year" name="graduation_year" value={form.graduation_year} onChange={handleFormChange} disabled={isSubmitting}>
                        <option value="">選択しない</option>
                        {getGraduationYears().map((y) => <option key={y} value={y.toString()}>{getGraduationYearLabel(y)}</option>)}
                      </StudioSelect>
                    </div>
                  </div>

                  <StudioFormField label="学校名" name="school_name" value={form.school_name}
                    onChange={handleFormChange} placeholder="例: 東京大学" disabled={isSubmitting} />

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField label="学部名" name="faculty_name" value={form.faculty_name}
                      onChange={handleFormChange} placeholder="例: 工学部" disabled={isSubmitting} />
                    <StudioFormField label="学科名" name="department_name" value={form.department_name}
                      onChange={handleFormChange} placeholder="例: 情報工学科" disabled={isSubmitting} />
                  </div>

                  <div className="space-y-2">
                    <StudioLabel htmlFor="major_field">文理区分</StudioLabel>
                    <StudioSelect id="major_field" name="major_field" value={form.major_field} onChange={handleFormChange} disabled={isSubmitting}>
                      <option value="">選択しない</option>
                      {MAJOR_CATEGORIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </StudioSelect>
                  </div>
                </div>
              </div>

              {/* === 興味・志望 === */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">興味・志望</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <StudioLabel>興味のある業界</StudioLabel>
                    <div className="flex flex-wrap gap-2">
                      {DESIRED_INDUSTRIES.map((ind) => (
                        <button key={ind} type="button" disabled={isSubmitting}
                          onClick={() => toggleIndustry(ind)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            selectedIndustries.includes(ind)
                              ? "bg-red-50 border-red-300 text-red-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}>
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <StudioLabel>興味のある職種</StudioLabel>
                    <div className="flex flex-wrap gap-2">
                      {DESIRED_JOB_TYPES.map((job) => (
                        <button key={job} type="button" disabled={isSubmitting}
                          onClick={() => toggleJobType(job)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            selectedJobTypes.includes(job)
                              ? "bg-red-50 border-red-300 text-red-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}>
                          {job}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* === 流入元・UTM === */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">流入元・UTM</h3>
                <div className="space-y-4">
                  <StudioFormField label="流入元（referrer）" name="referrer" value={form.referrer}
                    onChange={handleFormChange} placeholder="例: イベント名" disabled={isSubmitting} />
                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField label="utm_source" name="utm_source" value={form.utm_source}
                      onChange={handleFormChange} disabled={isSubmitting} />
                    <StudioFormField label="utm_medium" name="utm_medium" value={form.utm_medium}
                      onChange={handleFormChange} disabled={isSubmitting} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <StudioFormField label="utm_campaign" name="utm_campaign" value={form.utm_campaign}
                      onChange={handleFormChange} disabled={isSubmitting} />
                    <StudioFormField label="utm_content" name="utm_content" value={form.utm_content}
                      onChange={handleFormChange} disabled={isSubmitting} />
                    <StudioFormField label="utm_term" name="utm_term" value={form.utm_term}
                      onChange={handleFormChange} disabled={isSubmitting} />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                初期パスワード設定の案内メールが送信されます。
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleCreateStudent}
                disabled={isSubmitting || Object.values(fieldErrors).some(Boolean)}>
                {isSubmitting ? "作成中..." : "作成"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* ========== CSV取り込みモーダル ========== */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !csvSubmitting && setIsCsvModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCsvModalOpen(false)} disabled={csvSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">CSVで学生を登録</h2>
              <p className="text-sm text-gray-600">UTF-8のCSVファイルで学生を一括登録できます。招待メールが自動送信されます。</p>
            </div>
            <div className="p-8 space-y-4">
              {csvFatalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{csvFatalError}</p>
                </div>
              )}
              {csvResult && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-green-800">成功 {csvResult.created} 件</p>
                  </div>
                  {csvResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-bold text-amber-800 mb-2">失敗 {csvResult.errors.length} 件</p>
                      <ul className="text-xs text-amber-800 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {csvResult.errors.map((e, i) => <li key={i}>{e.row}行目: {e.message}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CSVファイル</label>
                <input type="file" accept=".csv"
                  onChange={(e) => { const f = e.target.files?.[0]; setCsvFile(f ?? null); if (!f) setCsvResult(null); }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  disabled={csvSubmitting} />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <button type="button" onClick={handleDownloadCsvTemplate} className="underline text-red-600 hover:text-red-700 font-bold">
                    テンプレートCSVをダウンロード
                  </button>
                  してフォーマットを確認してください。データ行は最大200行までです。
                </p>
                <p>必須列: メールアドレス, 姓, 名, 姓カナ, 名カナ</p>
                <p>任意列: 性別, 生年月日, 電話番号, 学校種別, 学校名, 学部名, 学科名, 文理区分, 卒業年度, 希望勤務地, 興味のある業界, 興味のある職種, 流入元, utm_source〜utm_term</p>
                <p>複数値（業界・職種）はセミコロン（;）区切りで入力してください。</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCsvModalOpen(false)} disabled={csvSubmitting}>
                閉じる
              </StudioButton>
              <StudioButton variant="primary" onClick={handleCsvImport} disabled={csvSubmitting || !csvFile}>
                {csvSubmitting ? "取り込み中..." : "取り込み"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
