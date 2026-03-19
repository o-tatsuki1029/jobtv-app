"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building, Plus, X, Search, FileUp, Pencil } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import PrefectureSelect from "@/components/studio/molecules/PrefectureSelect";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import { getCompanies, createCompanyWithRecruiter } from "@/lib/actions/company-account-actions";
import { createCompaniesFromCsv } from "@/lib/actions/company-csv-import";
import { createVideosFromCsv } from "@/lib/actions/video-csv-import";
import { createRecruitersFromCsv } from "@/lib/actions/recruiter-csv-import";
import { downloadCSV } from "@/lib/utils/csv";
import { validateRequired, validateMaxLength, validateUrlWithProtocol, validateEmail, validateKatakana } from "@jobtv-app/shared/utils/validation";
import { REPRESENTATIVE_NAME_MAX_LENGTH, COMPANY_INFO_MAX_LENGTH } from "@/constants/validation";
import type { Tables } from "@jobtv-app/shared/types";
import {
  generateIndustryOptions,
  generateYearOptions,
  generateMonthOptions,
  generateEmployeesRangeOptions
} from "@/constants/company-options";

type Company = Tables<"companies">;

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export default function AdminCompanyAccountsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [isVideoCsvModalOpen, setIsVideoCsvModalOpen] = useState(false);
  const [videoCsvFile, setVideoCsvFile] = useState<File | null>(null);
  const [videoCsvSubmitting, setVideoCsvSubmitting] = useState(false);
  const [videoCsvResult, setVideoCsvResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [videoCsvFatalError, setVideoCsvFatalError] = useState<string | null>(null);
  const [isRecruiterCsvModalOpen, setIsRecruiterCsvModalOpen] = useState(false);
  const [recruiterCsvFile, setRecruiterCsvFile] = useState<File | null>(null);
  const [recruiterCsvSubmitting, setRecruiterCsvSubmitting] = useState(false);
  const [recruiterCsvResult, setRecruiterCsvResult] = useState<{ created: number; warnings: number; errors: { row: number; message: string }[] } | null>(null);
  const [recruiterCsvFatalError, setRecruiterCsvFatalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc">("name_asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    established?: string;
    representative?: string;
    employees?: string;
    website?: string;
    company_info?: string;
    industry?: string;
    prefecture?: string;
    address_line1?: string;
    address_line2?: string;
    email?: string;
    last_name?: string;
    first_name?: string;
    last_name_kana?: string;
    first_name_kana?: string;
    _general?: string; // 一般的なエラーメッセージ用
  }>({});

  // フォーム状態
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    prefecture: "",
    address_line1: "",
    address_line2: "",
    website: "",
    representative: "",
    established: "",
    employees: "",
    company_info: "",
    status: "active" as "active" | "closed",
  });

  // 設立年月の状態（年と月を分けて管理）
  const [establishedYear, setEstablishedYear] = useState<string>("");
  const [establishedMonth, setEstablishedMonth] = useState<string>("");

  // 設立年月をパースする関数
  const parseEstablishedDate = (dateString: string): { year: string; month: string } | null => {
    if (!dateString) return null;
    const pattern1 = /^(\d{4})年(\d{1,2})月?$/;
    const match1 = dateString.match(pattern1);
    if (match1) {
      return { year: match1[1], month: match1[2].padStart(2, "0") };
    }
    const pattern2 = /^(\d{4})[-/.](\d{1,2})$/;
    const match2 = dateString.match(pattern2);
    if (match2) {
      return { year: match2[1], month: match2[2].padStart(2, "0") };
    }
    return null;
  };

  // 年と月から設立年月文字列を生成
  const formatEstablishedDate = (year: string, month: string): string => {
    if (!year || !month) return "";
    return `${year}年${parseInt(month)}月`;
  };

  const [recruiterForm, setRecruiterForm] = useState({
    email: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
  });

  const loadCompanies = async (currentPage = page) => {
    setLoading(true);
    setError(null);
    const { data, count, error: fetchError } = await getCompanies({
      limit: pageSize,
      offset: currentPage * pageSize,
      search: debouncedSearch || undefined,
      sortBy,
    });
    if (fetchError) {
      setError(fetchError);
    } else {
      setCompanies(data || []);
      setTotalCount(count);
    }
    setLoading(false);
  };

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 検索・ソート・ページサイズ変更時はページ0にリセット
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sortBy, pageSize]);

  // ページ・検索・ソート・ページサイズ変更時にデータ再取得
  useEffect(() => {
    loadCompanies(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, sortBy, pageSize]);

  const handleOpenCreateModal = () => {
    setCompanyForm({
      name: "",
      industry: "",
      prefecture: "",
      address_line1: "",
      address_line2: "",
      website: "",
      representative: "",
      established: "",
      employees: "",
      company_info: "",
      status: "active",
    });
    setEstablishedYear("");
    setEstablishedMonth("");
    setRecruiterForm({
      email: "",
      last_name: "",
      first_name: "",
      last_name_kana: "",
      first_name_kana: "",
    });
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
      "企業名", "業界", "都道府県", "市区町村・番地", "ビル名・部屋番号", "公式サイト", "代表者名", "設立年月", "従業員数", "企業情報", "ステータス",
      "ロゴURL", "サムネイルURL",
      "郵便番号", "電話番号", "売上高", "資本金", "平均年齢", "上場区分", "過去サービスID", "SNS_Facebook",
      "事業詳細", "本社所在地", "グループ会社", "研修制度",
      "タグライン", "企業ページ説明文", "SNS_X", "SNS_Instagram", "SNS_TikTok", "SNS_YouTube", "福利厚生", "企業ページステータス",
    ];
    const sample = [
      "サンプル株式会社", "IT・ソフトウエア", "東京都", "渋谷区1-2-3", "サンプルビル5F", "https://example.com", "山田太郎", "2020年4月", "51-100人", "企業情報の例。", "active",
      "https://example.com/logo.png", "https://example.com/thumb.jpg",
      "100-0001", "03-1234-5678", "10億円", "1億円", "28.5", "東証プライム", "SVC-001", "https://facebook.com/example",
      "Webサービスの企画・開発・運営", "東京都渋谷区1-2-3", "サンプルホールディングス", "入社時研修3ヶ月",
      "未来を創るテクノロジー", "私たちは革新的なソリューションを提供しています。", "https://x.com/example", "https://instagram.com/example", "https://tiktok.com/@example", "https://youtube.com/@example", "社会保険完備;交通費支給;住宅手当", "active",
    ];
    downloadCSV(headers, [sample], "company-accounts-template");
  };

  const handleOpenVideoCsvModal = () => {
    setVideoCsvFile(null);
    setVideoCsvResult(null);
    setVideoCsvFatalError(null);
    setIsVideoCsvModalOpen(true);
  };

  const handleDownloadVideoCsvTemplate = () => {
    const headers = ["企業ID", "動画タイトル", "動画種別", "動画URL", "サムネイルURL"];
    const sample = ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "企業紹介動画", "main", "https://example.com/video.mp4", "https://example.com/thumb.jpg"];
    downloadCSV(headers, [sample], "video-import-template");
  };

  const handleVideoCsvImport = async () => {
    if (!videoCsvFile) return;
    setVideoCsvSubmitting(true);
    setVideoCsvResult(null);
    setVideoCsvFatalError(null);
    const formData = new FormData();
    formData.append("file", videoCsvFile);
    try {
      const { data, error } = await createVideosFromCsv(formData);
      if (error) {
        setVideoCsvFatalError(error);
        return;
      }
      if (data) {
        setVideoCsvResult(data);
      }
    } catch {
      setVideoCsvFatalError("取り込み中にエラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setVideoCsvSubmitting(false);
    }
  };

  const handleOpenRecruiterCsvModal = () => {
    setRecruiterCsvFile(null);
    setRecruiterCsvResult(null);
    setRecruiterCsvFatalError(null);
    setIsRecruiterCsvModalOpen(true);
  };

  const handleDownloadRecruiterCsvTemplate = () => {
    const headers = ["企業ID", "メールアドレス", "姓", "名", "姓（カナ）", "名（カナ）"];
    const sample = ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "recruiter@example.com", "山田", "太郎", "ヤマダ", "タロウ"];
    downloadCSV(headers, [sample], "recruiter-invite-template");
  };

  const handleRecruiterCsvImport = async () => {
    if (!recruiterCsvFile) return;
    setRecruiterCsvSubmitting(true);
    setRecruiterCsvResult(null);
    setRecruiterCsvFatalError(null);
    const formData = new FormData();
    formData.append("file", recruiterCsvFile);
    try {
      const { data, error } = await createRecruitersFromCsv(formData);
      if (error) {
        setRecruiterCsvFatalError(error);
        return;
      }
      if (data) {
        setRecruiterCsvResult(data);
      }
    } catch {
      setRecruiterCsvFatalError("取り込み中にエラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setRecruiterCsvSubmitting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvSubmitting(true);
    setCsvResult(null);
    setCsvFatalError(null);
    const formData = new FormData();
    formData.append("file", csvFile);
    try {
      const { data, error } = await createCompaniesFromCsv(formData);
      if (error) {
        setCsvFatalError(error);
        return;
      }
      if (data) {
        setCsvResult(data);
        if (data.created > 0) {
          setPage(0);
        }
      }
    } catch {
      setCsvFatalError("取り込み中にエラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setCsvSubmitting(false);
    }
  };

  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setEstablishedYear(year);
    const newEstablished = year && establishedMonth ? formatEstablishedDate(year, establishedMonth) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
    const error = validateField("established", newEstablished);
    setFieldErrors((prev) => ({
      ...prev,
      established: error,
    }));
  };

  const handleEstablishedMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setEstablishedMonth(month);
    const newEstablished = establishedYear && month ? formatEstablishedDate(establishedYear, month) : "";
    setCompanyForm((prev) => ({ ...prev, established: newEstablished }));
    const error = validateField("established", newEstablished);
    setFieldErrors((prev) => ({
      ...prev,
      established: error,
    }));
  };

  const handleEmployeesRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setCompanyForm((prev) => ({ ...prev, employees: range }));
    const error = validateField("employees", range);
    setFieldErrors((prev) => ({
      ...prev,
      employees: error,
    }));
  };

  // バリデーション関数
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "name": {
        const requiredError = validateRequired(value, "企業名");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "established": {
        if (!establishedYear || !establishedMonth) {
          return "設立年月は必須です";
        }
        return undefined;
      }
      case "representative": {
        const requiredError = validateRequired(value, "代表者名");
        if (requiredError) return requiredError;
        return validateMaxLength(value, REPRESENTATIVE_NAME_MAX_LENGTH, "代表者名") || undefined;
      }
      case "employees": {
        const requiredError = validateRequired(value, "従業員数");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "website": {
        const requiredError = validateRequired(value, "公式サイト");
        if (requiredError) return requiredError;
        return validateUrlWithProtocol(value, "公式サイト") || undefined;
      }
      case "company_info": {
        const requiredError = validateRequired(value, "企業情報");
        if (requiredError) return requiredError;
        return validateMaxLength(value, COMPANY_INFO_MAX_LENGTH, "企業情報") || undefined;
      }
      case "industry": {
        const requiredError = validateRequired(value, "業界");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "prefecture": {
        const requiredError = validateRequired(value, "都道府県");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "address_line1": {
        const requiredError = validateRequired(value, "市区町村・番地");
        if (requiredError) return requiredError;
        return undefined;
      }
      case "email":
        return validateEmail(value) || undefined;
      case "last_name":
      case "first_name":
        return validateRequired(value, name === "last_name" ? "姓" : "名") || undefined;
      case "last_name_kana":
      case "first_name_kana": {
        const requiredError = validateRequired(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）");
        if (requiredError) return requiredError;
        return validateKatakana(value, name === "last_name_kana" ? "姓（カナ）" : "名（カナ）") || undefined;
      }
      default:
        return undefined;
    }
  };

  const handleCompanyFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };


  const handleRecruiterFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecruiterForm((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleCreateCompany = async () => {
    // バリデーション
    const errors: typeof fieldErrors = {};
    let hasValidationError = false;

    // 企業情報のバリデーション
    const nameError = validateField("name", companyForm.name);
    if (nameError) {
      errors.name = nameError;
      hasValidationError = true;
    }

    const establishedError = validateField("established", companyForm.established);
    if (establishedError) {
      errors.established = establishedError;
      hasValidationError = true;
    }

    const representativeError = validateField("representative", companyForm.representative);
    if (representativeError) {
      errors.representative = representativeError;
      hasValidationError = true;
    }

    const employeesError = validateField("employees", companyForm.employees);
    if (employeesError) {
      errors.employees = employeesError;
      hasValidationError = true;
    }

    const websiteError = validateField("website", companyForm.website);
    if (websiteError) {
      errors.website = websiteError;
      hasValidationError = true;
    }

    const companyInfoError = validateField("company_info", companyForm.company_info);
    if (companyInfoError) {
      errors.company_info = companyInfoError;
      hasValidationError = true;
    }

    const industryError = validateField("industry", companyForm.industry);
    if (industryError) {
      errors.industry = industryError;
      hasValidationError = true;
    }

    const prefectureError = validateField("prefecture", companyForm.prefecture);
    if (prefectureError) {
      errors.prefecture = prefectureError;
      hasValidationError = true;
    }

    const addressLine1Error = validateField("address_line1", companyForm.address_line1);
    if (addressLine1Error) {
      errors.address_line1 = addressLine1Error;
      hasValidationError = true;
    }

    // リクルーター情報のバリデーション
    const emailError = validateField("email", recruiterForm.email);
    if (emailError) {
      errors.email = emailError;
      hasValidationError = true;
    }

    const lastNameError = validateField("last_name", recruiterForm.last_name);
    if (lastNameError) {
      errors.last_name = lastNameError;
      hasValidationError = true;
    }

    const firstNameError = validateField("first_name", recruiterForm.first_name);
    if (firstNameError) {
      errors.first_name = firstNameError;
      hasValidationError = true;
    }

    const lastNameKanaError = validateField("last_name_kana", recruiterForm.last_name_kana);
    if (lastNameKanaError) {
      errors.last_name_kana = lastNameKanaError;
      hasValidationError = true;
    }

    const firstNameKanaError = validateField("first_name_kana", recruiterForm.first_name_kana);
    if (firstNameKanaError) {
      errors.first_name_kana = firstNameKanaError;
      hasValidationError = true;
    }

    if (hasValidationError) {
      setFieldErrors({
        ...errors,
        _general: "入力内容に誤りがあります。各フィールドのエラーを確認してください。",
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const { data, error: createError } = await createCompanyWithRecruiter(
      {
        name: companyForm.name,
        industry: companyForm.industry || null,
        prefecture: companyForm.prefecture || null,
        address_line1: companyForm.address_line1 || null,
        address_line2: companyForm.address_line2 || null,
        website: companyForm.website || null,
        representative: companyForm.representative || null,
        established: companyForm.established || null,
        employees: companyForm.employees || null,
        company_info: companyForm.company_info || null,
        status: companyForm.status,
      },
      {
        email: recruiterForm.email,
        last_name: recruiterForm.last_name,
        first_name: recruiterForm.first_name,
        last_name_kana: recruiterForm.last_name_kana,
        first_name_kana: recruiterForm.first_name_kana,
      }
    );

    if (createError) {
      setIsSubmitting(false);
      // エラーメッセージはモーダル内に表示するため、setErrorは使用しない
      setFieldErrors((prev) => ({
        ...prev,
        _general: createError,
      }));
      return;
    }

    if (data) {
      setSuccessMessage("企業とリクルーターアカウントを作成しました。初期パスワード設定の案内メールを送信しました。");
      setIsCreateModalOpen(false);
      setPage(0);
    }
    setIsSubmitting(false);
  };


  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <StudioBadge variant="success">有効</StudioBadge>;
    } else if (status === "closed") {
      return <StudioBadge variant="neutral">無効</StudioBadge>;
    }
    return <StudioBadge variant="neutral">未設定</StudioBadge>;
  };

  const isInitialLoading = loading && totalCount === null;

  if (isInitialLoading) {
    return <LoadingSpinner />;
  }

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
            <Building className="w-8 h-8" />
            企業アカウント管理
          </h1>
          <p className="text-gray-500 font-medium">企業とリクルーターアカウントを管理できます。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudioButton variant="outline" icon={<FileUp className="w-4 h-4" />} onClick={handleOpenRecruiterCsvModal}>
            担当者CSVで招待
          </StudioButton>
          <StudioButton variant="outline" icon={<FileUp className="w-4 h-4" />} onClick={handleOpenVideoCsvModal}>
            動画CSVで登録
          </StudioButton>
          <StudioButton variant="outline" icon={<FileUp className="w-4 h-4" />} onClick={handleOpenCsvModal}>
            CSVで企業を登録
          </StudioButton>
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            新規企業を作成
          </StudioButton>
        </div>
      </div>

      {/* 検索とソート */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* 検索フィールド */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="企業名で検索"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-gray-900"
          />
        </div>

        {/* ソート */}
        {(companies.length > 0 || totalCount !== null) && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-gray-700">並び順:</label>
            <StudioSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as "name_asc" | "name_desc")}>
              <option value="name_asc">企業名（あいうえお順）</option>
              <option value="name_desc">企業名（逆順）</option>
            </StudioSelect>
          </div>
        )}
      </div>

      {/* ページネーション（テーブル上） */}
      {(companies.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={companies.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(n) => setPageSize(n as PageSizeOption)}
          unit="社"
        />
      )}


      {/* 企業一覧テーブル */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">企業名</th>
                <th className="px-6 py-4">業界</th>
                <th className="px-6 py-4">所在地</th>
                <th className="px-6 py-4">ステータス</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>{searchQuery ? "検索結果が見つかりませんでした" : "企業がありません"}</p>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{company.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.industry || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{company.prefecture || "-"}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(company.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StudioButton
                          variant="outline"
                          size="sm"
                          icon={<Pencil className="w-4 h-4" />}
                          onClick={() => router.push(`/admin/company-accounts/${company.id}`)}
                        >
                          編集
                        </StudioButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション（テーブル下） */}
      {(companies.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={companies.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(n) => setPageSize(n as PageSizeOption)}
          unit="社"
        />
      )}

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">新規企業を作成</h2>
              <p className="text-sm text-gray-600">企業情報とリクルーターアカウントを作成します。</p>
            </div>

            <div className="p-8 space-y-6">
              {fieldErrors._general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{fieldErrors._general}</p>
                </div>
              )}

              {/* 企業情報セクション */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">企業情報</h3>
                <div className="space-y-6">
                  <StudioFormField
                    label="企業名"
                    name="name"
                    value={companyForm.name}
                    onChange={handleCompanyFormChange}
                    placeholder="企業名を入力"
                    required
                    error={fieldErrors.name}
                    disabled={isSubmitting}
                  />

                  <div className="space-y-2">
                    <StudioLabel htmlFor="established-year" required>
                      設立年月
                    </StudioLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <StudioSelect
                          id="established-year"
                          value={establishedYear}
                          onChange={handleEstablishedYearChange}
                          error={!!fieldErrors.established}
                          disabled={isSubmitting}
                        >
                          <option value="">年を選択</option>
                          {generateYearOptions().map((year) => (
                            <option key={year} value={year.toString()}>
                              {year}年
                            </option>
                          ))}
                        </StudioSelect>
                      </div>
                      <div>
                        <StudioSelect
                          id="established-month"
                          value={establishedMonth}
                          onChange={handleEstablishedMonthChange}
                          error={!!fieldErrors.established}
                          disabled={isSubmitting}
                        >
                          <option value="">月を選択</option>
                          {generateMonthOptions().map((month) => (
                            <option key={month} value={month.toString().padStart(2, "0")}>
                              {month}月
                            </option>
                          ))}
                        </StudioSelect>
                      </div>
                    </div>
                    {fieldErrors.established && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.established}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StudioFormField
                      label="代表者名"
                      name="representative"
                      value={companyForm.representative}
                      onChange={handleCompanyFormChange}
                      placeholder="代表者名を入力"
                      required
                      error={fieldErrors.representative}
                      disabled={isSubmitting}
                    />
                    <div className="space-y-2">
                      <StudioLabel htmlFor="employees" required>
                        従業員数
                      </StudioLabel>
                      <StudioSelect
                        id="employees"
                        name="employees"
                        value={companyForm.employees}
                        onChange={handleEmployeesRangeChange}
                        error={!!fieldErrors.employees}
                        disabled={isSubmitting}
                      >
                        {generateEmployeesRangeOptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </StudioSelect>
                      {fieldErrors.employees && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.employees}</p>}
                    </div>
                  </div>

                  <StudioFormField
                    label="公式サイト"
                    name="website"
                    value={companyForm.website}
                    onChange={handleCompanyFormChange}
                    placeholder="https://example.com"
                    required
                    error={fieldErrors.website}
                    disabled={isSubmitting}
                  />

                  <StudioFormField
                    label="企業情報"
                    name="company_info"
                    type="textarea"
                    value={companyForm.company_info}
                    onChange={handleCompanyFormChange}
                    placeholder="企業の詳細情報を入力してください（300字以内）"
                    rows={6}
                    maxLength={COMPANY_INFO_MAX_LENGTH}
                    showCharCount
                    required
                    error={fieldErrors.company_info}
                    disabled={isSubmitting}
                  />

                  <div className="space-y-2">
                    <StudioLabel htmlFor="industry" required>
                      業界
                    </StudioLabel>
                    <StudioSelect
                      id="industry"
                      name="industry"
                      value={companyForm.industry || ""}
                      onChange={handleCompanyFormChange}
                      error={!!fieldErrors.industry}
                      disabled={isSubmitting}
                    >
                      {generateIndustryOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </StudioSelect>
                    {fieldErrors.industry && <p className="text-[10px] text-red-500 font-bold">{fieldErrors.industry}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PrefectureSelect
                      value={companyForm.prefecture}
                      onChange={(e) => setCompanyForm({ ...companyForm, prefecture: e.target.value })}
                      error={fieldErrors.prefecture}
                      disabled={isSubmitting}
                      required
                    />
                    <StudioFormField
                      label="市区町村・番地"
                      name="address_line1"
                      value={companyForm.address_line1}
                      onChange={handleCompanyFormChange}
                      placeholder="例: 渋谷区1-2-3"
                      required
                      error={fieldErrors.address_line1}
                      disabled={isSubmitting}
                    />
                  </div>

                  <StudioFormField
                    label="ビル名・部屋番号"
                    name="address_line2"
                    value={companyForm.address_line2}
                    onChange={handleCompanyFormChange}
                    placeholder="例: サンプルビル5階"
                    error={fieldErrors.address_line2}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* リクルーター情報セクション */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">リクルーター情報</h3>
                <div className="space-y-4">
                  <StudioFormField
                    label="メールアドレス"
                    name="email"
                    type="email"
                    value={recruiterForm.email}
                    onChange={handleRecruiterFormChange}
                    placeholder="recruiter@example.com"
                    required
                    error={fieldErrors.email}
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField
                      label="姓"
                      name="last_name"
                      value={recruiterForm.last_name}
                      onChange={handleRecruiterFormChange}
                      placeholder="姓を入力"
                      required
                      error={fieldErrors.last_name}
                      disabled={isSubmitting}
                    />

                    <StudioFormField
                      label="名"
                      name="first_name"
                      value={recruiterForm.first_name}
                      onChange={handleRecruiterFormChange}
                      placeholder="名を入力"
                      required
                      error={fieldErrors.first_name}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <StudioFormField
                      label="姓（カナ）"
                      name="last_name_kana"
                      value={recruiterForm.last_name_kana}
                      onChange={handleRecruiterFormChange}
                      placeholder="セイを入力"
                      required
                      error={fieldErrors.last_name_kana}
                      disabled={isSubmitting}
                    />

                    <StudioFormField
                      label="名（カナ）"
                      name="first_name_kana"
                      value={recruiterForm.first_name_kana}
                      onChange={handleRecruiterFormChange}
                      placeholder="メイを入力"
                      required
                      error={fieldErrors.first_name_kana}
                      disabled={isSubmitting}
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    初期パスワード設定の案内メールが送信されます。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleCreateCompany}
                disabled={isSubmitting || Object.values(fieldErrors).some(Boolean)}
              >
                {isSubmitting ? "作成中..." : "作成"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* 動画CSV取り込みモーダル */}
      {isVideoCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !videoCsvSubmitting && setIsVideoCsvModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsVideoCsvModalOpen(false)}
              disabled={videoCsvSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">CSVで動画を登録</h2>
              <p className="text-sm text-gray-600">UTF-8のCSVファイルで動画を一括登録できます。企業ID（または旧サービスID）・動画種別・動画URLは必須です。動画種別は main / short / documentary のいずれかを指定してください。</p>
            </div>
            <div className="p-8 space-y-4">
              {videoCsvFatalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{videoCsvFatalError}</p>
                </div>
              )}
              {videoCsvResult && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-green-800">成功 {videoCsvResult.created} 件</p>
                  </div>
                  {videoCsvResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-bold text-amber-800 mb-2">失敗 {videoCsvResult.errors.length} 件</p>
                      <ul className="text-xs text-amber-800 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {videoCsvResult.errors.map((e, i) => (
                          <li key={i}>{e.row}行目: {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CSVファイル</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setVideoCsvFile(f ?? null);
                    if (!f) setVideoCsvResult(null);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  disabled={videoCsvSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500">
                <button type="button" onClick={handleDownloadVideoCsvTemplate} className="underline text-red-600 hover:text-red-700 font-bold">
                  テンプレートCSVをダウンロード
                </button>
                してフォーマットを確認してください。データ行は最大3000行までです。
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsVideoCsvModalOpen(false)} disabled={videoCsvSubmitting}>
                閉じる
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleVideoCsvImport}
                disabled={videoCsvSubmitting || !videoCsvFile}
              >
                {videoCsvSubmitting ? "取り込み中..." : "取り込み"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* 担当者CSV招待モーダル */}
      {isRecruiterCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !recruiterCsvSubmitting && setIsRecruiterCsvModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsRecruiterCsvModalOpen(false)}
              disabled={recruiterCsvSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">CSVで担当者を招待</h2>
              <p className="text-sm text-gray-600">UTF-8のCSVファイルでリクルーターを一括招待できます。企業ID（またはサービスID）・メールアドレスは必須です。姓名・カナは任意です。</p>
            </div>
            <div className="p-8 space-y-4">
              {recruiterCsvFatalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{recruiterCsvFatalError}</p>
                </div>
              )}
              {recruiterCsvResult && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-green-800">成功 {recruiterCsvResult.created} 件</p>
                    {recruiterCsvResult.warnings > 0 && (
                      <p className="text-xs text-amber-700 mt-1">（うちメール送信失敗 {recruiterCsvResult.warnings} 件 — アカウントは作成済み）</p>
                    )}
                  </div>
                  {recruiterCsvResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-bold text-amber-800 mb-2">失敗 {recruiterCsvResult.errors.length} 件</p>
                      <ul className="text-xs text-amber-800 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {recruiterCsvResult.errors.map((e, i) => (
                          <li key={i}>{e.row}行目: {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CSVファイル</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setRecruiterCsvFile(f ?? null);
                    if (!f) setRecruiterCsvResult(null);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  disabled={recruiterCsvSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500">
                <button type="button" onClick={handleDownloadRecruiterCsvTemplate} className="underline text-red-600 hover:text-red-700 font-bold">
                  テンプレートCSVをダウンロード
                </button>
                してフォーマットを確認してください。データ行は最大500行までです。
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsRecruiterCsvModalOpen(false)} disabled={recruiterCsvSubmitting}>
                閉じる
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleRecruiterCsvImport}
                disabled={recruiterCsvSubmitting || !recruiterCsvFile}
              >
                {recruiterCsvSubmitting ? "招待中..." : "招待"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* CSV取り込みモーダル */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !csvSubmitting && setIsCsvModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCsvModalOpen(false)}
              disabled={csvSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">CSVで企業を登録</h2>
              <p className="text-sm text-gray-600">UTF-8のCSVファイルで企業を一括登録できます。企業名のみ必須、それ以外は全て任意項目です。企業ページ関連の項目を入力すると企業ページも同時に作成されます。</p>
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
                        {csvResult.errors.map((e, i) => (
                          <li key={i}>{e.row}行目: {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CSVファイル</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setCsvFile(f ?? null);
                    if (!f) setCsvResult(null);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  disabled={csvSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500">
                <button type="button" onClick={handleDownloadCsvTemplate} className="underline text-red-600 hover:text-red-700 font-bold">
                  テンプレートCSVをダウンロード
                </button>
                してフォーマットを確認してください。データ行は最大1000行までです。
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCsvModalOpen(false)} disabled={csvSubmitting}>
                閉じる
              </StudioButton>
              <StudioButton
                variant="primary"
                onClick={handleCsvImport}
                disabled={csvSubmitting || !csvFile}
              >
                {csvSubmitting ? "取り込み中..." : "取り込み"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

