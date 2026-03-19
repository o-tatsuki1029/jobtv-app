"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import { getAllReservations } from "@/lib/actions/session-reservation-actions";
import { getCompanyApplications } from "@/lib/actions/application-actions";
import { downloadCSV } from "@/lib/utils/csv";

interface ReservationRow {
  id: string;
  status: string;
  attended: boolean;
  created_at: string;
  candidates: {
    last_name: string;
    first_name: string;
    last_name_kana: string | null;
    first_name_kana: string | null;
    phone: string | null;
    school_name: string | null;
    school_type: string | null;
    faculty_name: string | null;
    department_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    graduation_year: number | null;
    major_field: string | null;
    desired_work_location: string[] | null;
    desired_industry: string[] | null;
    desired_job_type: string[] | null;
    assigned_to: string | null;
    profiles?: { email: string | null } | null;
  } | null;
  session_date: {
    event_date: string;
    start_time: string;
    end_time: string;
  } | null;
  session: { id: string; title: string; graduation_year: number | null } | null;
}

interface ApplicationRow {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  current_status: string;
  created_at: string;
  job: { id: string; title: string; graduation_year: number | null } | null;
  candidates: {
    last_name: string;
    first_name: string;
    last_name_kana: string | null;
    first_name_kana: string | null;
    phone: string | null;
    school_name: string | null;
    school_type: string | null;
    faculty_name: string | null;
    department_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    graduation_year: number | null;
    major_field: string | null;
    desired_work_location: string[] | null;
    desired_industry: string[] | null;
    desired_job_type: string[] | null;
    assigned_to: string | null;
    profiles: { email: string | null } | null;
  } | null;
}

type UnifiedRow =
  | { kind: "reservation"; data: ReservationRow }
  | { kind: "application"; data: ApplicationRow };

interface FilterState {
  types: Set<"reservation" | "application">;
  sessionIds: Set<string>;
  jobIds: Set<string>;
  graduationYears: Set<number>;
}

const PAGE_SIZE = 20;

function getReservationStatusBadge(status: string) {
  switch (status) {
    case "reserved":
      return { variant: "success" as const, text: "予約済み" };
    case "cancelled":
      return { variant: "error" as const, text: "キャンセル" };
    case "completed":
      return { variant: "neutral" as const, text: "完了" };
    default:
      return { variant: "neutral" as const, text: status };
  }
}

function getApplicationStatusBadge(status: string) {
  switch (status) {
    case "applied":
      return { variant: "success" as const, text: "エントリー済み" };
    default:
      return { variant: "neutral" as const, text: status };
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function emptyFilters(): FilterState {
  return {
    types: new Set(),
    sessionIds: new Set(),
    jobIds: new Set(),
    graduationYears: new Set(),
  };
}

function countActiveFilters(f: FilterState): number {
  return f.types.size + f.sessionIds.size + f.jobIds.size + f.graduationYears.size;
}

function FilterChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        selected ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function CandidatesContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("jobId");
  const initialSessionId = searchParams.get("sessionId");
  const initialSessionTitle = searchParams.get("sessionTitle");

  const [rawReservations, setRawReservations] = useState<ReservationRow[]>([]);
  const [rawApplications, setRawApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(emptyFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [page, setPage] = useState(0);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);

  type DetailData = { type: "reservation"; row: ReservationRow } | { type: "application"; row: ApplicationRow };
  const [detailModal, setDetailModal] = useState<DetailData | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [resResult, appResult] = await Promise.all([
        getAllReservations({ limit: 10000, offset: 0 }),
        getCompanyApplications({ limit: 10000, offset: 0 }),
      ]);
      const reservations = (resResult.error ? [] : (resResult.data ?? [])) as ReservationRow[];
      const applications = (appResult.error ? [] : (appResult.data ?? [])) as ApplicationRow[];
      if (resResult.error) setError(resResult.error);
      if (appResult.error) setError(appResult.error);
      setRawReservations(reservations);
      setRawApplications(applications);
      setLoading(false);

      // URL パラメータによる初期フィルター
      if (initialJobId) {
        const matched = applications.find((a) => a.job?.id === initialJobId);
        if (matched?.job) {
          setFilters({ ...emptyFilters(), jobIds: new Set([matched.job.id]) });
          return;
        }
      }
      if (initialSessionId) {
        // 予約の存在有無に関わらず直接フィルターを適用する
        setFilters({ ...emptyFilters(), sessionIds: new Set([initialSessionId]) });
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterOptions = useMemo(() => {
    const sessions = new Map<string, string>();
    // URLパラメータで渡されたセッション名を先に登録（予約がない場合でも名前を表示するため）
    if (initialSessionId && initialSessionTitle) {
      sessions.set(initialSessionId, initialSessionTitle);
    }
    rawReservations.forEach((r) => r.session && sessions.set(r.session.id, r.session.title));
    const jobs = new Map<string, string>();
    rawApplications.forEach((a) => a.job && jobs.set(a.job.id, a.job.title));
    // 対象卒業年度: session.graduation_year / job.graduation_year
    const gradYears = new Set<number>();
    rawReservations.forEach((r) => {
      if (r.session?.graduation_year) gradYears.add(r.session.graduation_year);
    });
    rawApplications.forEach((a) => {
      if (a.job?.graduation_year) gradYears.add(a.job.graduation_year);
    });
    return { sessions, jobs, gradYears };
  }, [rawReservations, rawApplications, initialSessionId, initialSessionTitle]);

  const filteredRows = useMemo<UnifiedRow[]>(() => {
    const showReservations = filters.types.size === 0 || filters.types.has("reservation");
    const showApplications = filters.types.size === 0 || filters.types.has("application");

    const rows: UnifiedRow[] = [
      ...(showReservations ? rawReservations.map((d): UnifiedRow => ({ kind: "reservation", data: d })) : []),
      ...(showApplications ? rawApplications.map((d): UnifiedRow => ({ kind: "application", data: d })) : []),
    ].sort((a, b) => b.data.created_at.localeCompare(a.data.created_at));

    return rows.filter((row) => {
      if (row.kind === "reservation") {
        const r = row.data;
        if (filters.sessionIds.size > 0 && r.session && !filters.sessionIds.has(r.session.id)) return false;
        if (filters.graduationYears.size > 0) {
          const gy = r.session?.graduation_year;
          if (!gy || !filters.graduationYears.has(gy)) return false;
        }
      } else {
        const a = row.data;
        if (filters.jobIds.size > 0 && a.job && !filters.jobIds.has(a.job.id)) return false;
        if (filters.graduationYears.size > 0) {
          const gy = a.job?.graduation_year;
          if (!gy || !filters.graduationYears.has(gy)) return false;
        }
      }
      return true;
    });
  }, [rawReservations, rawApplications, filters]);

  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function openFilterModal() {
    setPendingFilters({
      types: new Set(filters.types),
      sessionIds: new Set(filters.sessionIds),
      jobIds: new Set(filters.jobIds),
      graduationYears: new Set(filters.graduationYears),
    });
    setFilterModalOpen(true);
  }

  function applyFilters() {
    setFilters(pendingFilters);
    setPage(0);
    setFilterModalOpen(false);
  }

  function clearAllFilters() {
    const empty = emptyFilters();
    setPendingFilters(empty);
    setFilters(empty);
    setPage(0);
  }

  function togglePending<T>(key: keyof FilterState, value: T) {
    setPendingFilters((prev) => {
      const next: FilterState = {
        types: new Set(prev.types),
        sessionIds: new Set(prev.sessionIds),
        jobIds: new Set(prev.jobIds),
        graduationYears: new Set(prev.graduationYears),
      };
      const set = next[key] as Set<T>;
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      return next;
    });
  }

  function removeFilter(key: keyof FilterState, value: unknown) {
    setFilters((prev) => {
      const next: FilterState = {
        types: new Set(prev.types),
        sessionIds: new Set(prev.sessionIds),
        jobIds: new Set(prev.jobIds),
        graduationYears: new Set(prev.graduationYears),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next[key] as Set<any>).delete(value);
      return next;
    });
    setPage(0);
  }

  const handleExportConfirm = async () => {
    setCsvExporting(true);
    const headers = [
      "予約日時", "種別", "タイトル", "開催日", "開始時刻", "終了時刻",
      "姓", "名", "姓カナ", "名カナ", "メール", "電話番号", "性別", "生年月日",
      "学校名", "学校区分", "学部名", "学科名", "文理区分", "卒業年度",
      "希望勤務地", "希望業界", "希望職種",
    ];

    const reservationRows = rawReservations.map((row) => {
      const c = row.candidates;
      const sd = row.session_date;
      const [datePart, timePart] = row.created_at.split("T");
      return [
        `${datePart.replace(/-/g, "/")} ${timePart.slice(0, 5)}`,
        "説明会予約",
        row.session?.title ?? "",
        sd?.event_date ? sd.event_date.replace(/-/g, "/") : "",
        sd?.start_time ? sd.start_time.slice(0, 5) : "",
        sd?.end_time ? sd.end_time.slice(0, 5) : "",
        c?.last_name ?? "", c?.first_name ?? "",
        c?.last_name_kana ?? "", c?.first_name_kana ?? "",
        c?.profiles?.email ?? "", c?.phone ?? "", c?.gender ?? "", c?.date_of_birth ?? "",
        c?.school_name ?? "", c?.school_type ?? "", c?.faculty_name ?? "", c?.department_name ?? "",
        c?.major_field ?? "",
        c?.graduation_year != null ? String(c.graduation_year) : "",
        (c?.desired_work_location ?? []).join("、"),
        (c?.desired_industry ?? []).join("、"),
        (c?.desired_job_type ?? []).join("、"),
      ];
    });

    const applicationRows = rawApplications.map((row) => {
      const c = row.candidates;
      const [datePart, timePart] = row.created_at.split("T");
      return [
        `${datePart.replace(/-/g, "/")} ${timePart.slice(0, 5)}`,
        "求人応募",
        row.job?.title ?? "",
        "", "", "",
        c?.last_name ?? "", c?.first_name ?? "",
        c?.last_name_kana ?? "", c?.first_name_kana ?? "",
        c?.profiles?.email ?? "", c?.phone ?? "", c?.gender ?? "", c?.date_of_birth ?? "",
        c?.school_name ?? "", c?.school_type ?? "", c?.faculty_name ?? "", c?.department_name ?? "",
        c?.major_field ?? "",
        c?.graduation_year != null ? String(c.graduation_year) : "",
        (c?.desired_work_location ?? []).join("、"),
        (c?.desired_industry ?? []).join("、"),
        (c?.desired_job_type ?? []).join("、"),
      ];
    });

    downloadCSV(headers, [...reservationRows, ...applicationRows], `candidates_${new Date().toISOString().slice(0, 10)}`);
    setCsvExporting(false);
    setCsvModalOpen(false);
  };

  const activeFilterCount = countActiveFilters(filters);
  const totalCsvCount = rawReservations.length + rawApplications.length;

  return (
    <div className="space-y-6">
      <ErrorMessage message={error || ""} />

      {/* 詳細モーダル */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const isReservation = detailModal.type === "reservation";
              const row = detailModal.row;
              const c = row.candidates;
              const sd = isReservation ? (detailModal.row as ReservationRow).session_date : null;
              const title = isReservation ? (detailModal.row as ReservationRow).session?.title : (detailModal.row as ApplicationRow).job?.title;
              const [datePart, timePart] = row.created_at.split("T");
              const displayName = c ? `${c.last_name} ${c.first_name}` : "不明";
              const displayNameKana = (c?.last_name_kana || c?.first_name_kana) ? `${c?.last_name_kana ?? ""} ${c?.first_name_kana ?? ""}`.trim() : null;

              function Cell({ label, value }: { label: string; value: React.ReactNode }) {
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400 font-medium">{label}</span>
                    <span className="text-sm text-gray-900 font-semibold">{value}</span>
                  </div>
                );
              }

              function Section({ title, children }: { title: string; children: React.ReactNode }) {
                return (
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">{title}</h3>
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      {children}
                    </div>
                  </section>
                );
              }

              return (
                <>
                  <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-600 text-lg">
                        {c?.last_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-base">{displayName}</p>
                        {displayNameKana && <p className="text-xs text-gray-400 mt-0.5">{displayNameKana}</p>}
                      </div>
                    </div>
                    <button onClick={() => setDetailModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    <Section title="エントリー情報">
                      <Cell label="種別" value={isReservation ? "説明会予約" : "求人応募"} />
                      <div className="col-span-2"><Cell label="タイトル" value={title ?? "-"} /></div>
                      <Cell label="予約日時" value={`${datePart.replace(/-/g, "/")} ${timePart.slice(0, 5)}`} />
                      {isReservation && (
                        <>
                          <Cell label="開催日" value={sd?.event_date ? sd.event_date.replace(/-/g, "/") : "-"} />
                          <Cell label="時間" value={sd ? `${sd.start_time.slice(0, 5)} 〜 ${sd.end_time.slice(0, 5)}` : "-"} />
                        </>
                      )}
                    </Section>

                    <Section title="連絡先・基本情報">
                      <Cell label="メール" value={c?.profiles?.email ?? "-"} />
                      <Cell label="電話番号" value={c?.phone ?? "-"} />
                      <Cell label="性別" value={c?.gender ?? "-"} />
                      <Cell label="生年月日" value={c?.date_of_birth ?? "-"} />
                    </Section>

                    <Section title="学歴">
                      <Cell label="学校名" value={c?.school_name ?? "-"} />
                      <Cell label="学校区分" value={c?.school_type ?? "-"} />
                      <Cell label="学部名" value={c?.faculty_name ?? "-"} />
                      <Cell label="学科名" value={c?.department_name ?? "-"} />
                      <Cell label="文理区分" value={c?.major_field ?? "-"} />
                      <Cell label="卒業年度" value={c?.graduation_year != null ? `${c.graduation_year}年度` : "-"} />
                    </Section>

                    <Section title="希望条件">
                      <Cell label="希望勤務地" value={(c?.desired_work_location ?? []).join("、") || "-"} />
                      <div className="col-span-2"><Cell label="希望業界" value={(c?.desired_industry ?? []).join("、") || "-"} /></div>
                      <div className="col-span-2"><Cell label="希望職種" value={(c?.desired_job_type ?? []).join("、") || "-"} /></div>
                    </Section>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* CSV確認モーダル */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-lg font-black mb-2">CSVエクスポートの確認</h2>
            <p className="text-sm text-gray-500 mb-6">全件をエクスポートします。</p>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">説明会予約</span>
                <span className="font-bold">{rawReservations.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">求人応募</span>
                <span className="font-bold">{rawApplications.length}件</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="font-bold">合計</span>
                <span className="font-black">{totalCsvCount}件</span>
              </div>
            </div>
            <div className="flex gap-3">
              <StudioButton variant="outline" fullWidth onClick={() => setCsvModalOpen(false)} disabled={csvExporting}>
                キャンセル
              </StudioButton>
              <StudioButton fullWidth onClick={handleExportConfirm} disabled={csvExporting || totalCsvCount === 0}>
                {csvExporting ? "出力中..." : "エクスポート"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* フィルターモーダル */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setFilterModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-black">絞り込み</h2>
              <button onClick={() => setFilterModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 種別 */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">種別</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip
                    label="説明会予約"
                    selected={pendingFilters.types.has("reservation")}
                    onToggle={() => togglePending("types", "reservation" as const)}
                  />
                  <FilterChip
                    label="求人応募"
                    selected={pendingFilters.types.has("application")}
                    onToggle={() => togglePending("types", "application" as const)}
                  />
                </div>
              </div>

              {/* 求人 */}
              {filterOptions.jobs.size > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">求人</p>
                  <div className="flex flex-wrap gap-2">
                    {[...filterOptions.jobs.entries()].map(([id, title]) => (
                      <FilterChip
                        key={id}
                        label={title}
                        selected={pendingFilters.jobIds.has(id)}
                        onToggle={() => togglePending("jobIds", id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 説明会 */}
              {filterOptions.sessions.size > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">説明会</p>
                  <div className="flex flex-wrap gap-2">
                    {[...filterOptions.sessions.entries()].map(([id, title]) => (
                      <FilterChip
                        key={id}
                        label={title}
                        selected={pendingFilters.sessionIds.has(id)}
                        onToggle={() => togglePending("sessionIds", id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 対象卒業年度 */}
              {filterOptions.gradYears.size > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">対象卒業年度</p>
                  <div className="flex flex-wrap gap-2">
                    {[...filterOptions.gradYears].sort().map((year) => (
                      <FilterChip
                        key={year}
                        label={`${year}年度`}
                        selected={pendingFilters.graduationYears.has(year)}
                        onToggle={() => togglePending("graduationYears", year)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-3">
              <button
                onClick={() => setPendingFilters(emptyFilters())}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                すべてクリア
              </button>
              <StudioButton onClick={applyFilters}>適用</StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">候補者管理</h1>
        <p className="text-gray-500 font-medium">説明会の予約者と求人への応募一覧を表示しています。</p>
      </div>

      {/* ツールバー */}
      <div className="flex items-center gap-3 justify-end">
        <StudioButton variant="outline" onClick={openFilterModal}>
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          絞り込み
          {activeFilterCount > 0 && (
            <span className="ml-1.5 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </StudioButton>
        <StudioButton onClick={() => setCsvModalOpen(true)}>CSVエクスポート</StudioButton>
      </div>

      {/* アクティブフィルターチップ */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">絞り込み中:</span>
          {[...filters.types].map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {v === "reservation" ? "説明会予約" : "求人応募"}
              <button onClick={() => removeFilter("types", v)} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...filters.jobIds].map((id) => (
            <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {filterOptions.jobs.get(id) ?? id}
              <button onClick={() => removeFilter("jobIds", id)} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...filters.sessionIds].map((id) => (
            <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {filterOptions.sessions.get(id) ?? id}
              <button onClick={() => removeFilter("sessionIds", id)} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...filters.graduationYears].sort().map((year) => (
            <span key={year} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {year}年度
              <button onClick={() => removeFilter("graduationYears", year)} className="hover:text-gray-900"><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors ml-1">
            すべて解除
          </button>
        </div>
      )}

      {/* ページネーション（上） */}
      {filteredRows.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={filteredRows.length}
          itemCount={pagedRows.length}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={() => {}}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}

      {/* テーブル */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">氏名</th>
                  <th className="px-6 py-4">種別</th>
                  <th className="px-6 py-4">タイトル</th>
                  <th className="px-6 py-4">日程</th>
                  <th className="px-6 py-4">登録日時</th>
                  <th className="px-6 py-4">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {activeFilterCount > 0 ? "条件に一致するデータがありません" : "データがありません"}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => {
                    if (row.kind === "reservation") {
                      const r = row.data;
                      const c = r.candidates;
                      const displayName = c ? `${c.last_name} ${c.first_name}` : "不明";
                      const email = c?.profiles?.email ?? "-";
                      const [d, t] = r.created_at.split("T");
                      return (
                        <tr key={`r-${r.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                {c?.last_name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StudioBadge variant="neutral">説明会予約</StudioBadge>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-600">{r.session?.title ?? "-"}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {r.session_date
                              ? `${formatDate(r.session_date.event_date)} ${r.session_date.start_time.slice(0, 5)}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-medium">{`${d.replace(/-/g, "/")} ${t.slice(0, 5)}`}</td>
                          <td className="px-6 py-4">
                            <StudioButton variant="outline" size="sm" onClick={() => setDetailModal({ type: "reservation", row: r })}>詳細</StudioButton>
                          </td>
                        </tr>
                      );
                    } else {
                      const a = row.data;
                      const c = a.candidates;
                      const displayName = c ? `${c.last_name} ${c.first_name}` : "不明";
                      const email = c?.profiles?.email ?? "-";
                      const [d, t] = a.created_at.split("T");
                      return (
                        <tr key={`a-${a.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                {c?.last_name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StudioBadge variant="success">求人応募</StudioBadge>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-600">{a.job?.title ?? "-"}</td>
                          <td className="px-6 py-4 text-gray-500">−</td>
                          <td className="px-6 py-4 text-gray-500 font-medium">{`${d.replace(/-/g, "/")} ${t.slice(0, 5)}`}</td>
                          <td className="px-6 py-4">
                            <StudioButton variant="outline" size="sm" onClick={() => setDetailModal({ type: "application", row: a })}>詳細</StudioButton>
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ページネーション（下） */}
      {filteredRows.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={filteredRows.length}
          itemCount={pagedRows.length}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={() => {}}
          pageSizeOptions={[PAGE_SIZE]}
        />
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CandidatesContent />
    </Suspense>
  );
}
