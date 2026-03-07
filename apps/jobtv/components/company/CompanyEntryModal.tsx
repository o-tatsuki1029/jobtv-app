"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, MapPin, Calendar, Loader2 } from "lucide-react";
import { useHeaderAuth } from "@/components/header/HeaderAuthContext";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import {
  createApplicationsForCandidate,
  getAppliedJobIdsForCurrentCandidate
} from "@/lib/actions/application-actions";
import {
  createSessionReservationForLoggedInCandidate,
  getReservedSessionDateIdsForCurrentCandidate
} from "@/lib/actions/session-reservation-actions";
import { cn } from "@jobtv-app/shared/utils/cn";

/** オーバーレイ上でのスクロールを止め、背景が動かないようにする。body は触らないのでスクロールバーは残る。 */
function usePreventScrollOnOverlay(overlayRef: React.RefObject<HTMLDivElement | null>, isOpen: boolean) {
  useEffect(() => {
    const el = overlayRef.current;
    if (!isOpen || !el) return;

    const prevent = (e: WheelEvent | TouchEvent) => {
      if (e.target !== el) return;
      e.preventDefault();
    };

    el.addEventListener("wheel", prevent, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      el.removeEventListener("wheel", prevent);
      el.removeEventListener("touchmove", prevent);
    };
  }, [isOpen, overlayRef]);
}

/** モーダル内で表示する求人アイテム（CompanyData.jobs の要素と同形） */
export interface EntryModalJob {
  id: string;
  title: string;
  location?: string;
  graduationYear?: string;
  coverImage?: string;
  prefecture?: string;
  employmentType?: string;
}

/** 説明会予約モーダル用の日程（id は session_date_id） */
export interface EntryModalSessionDate {
  id: string;
  date: string;
  time: string;
  capacity?: number | null;
  status?: "受付中" | "満員" | "実施済み";
}

export type EntryModalVariant = "job" | "session";

interface CompanyEntryModalPropsBase {
  isOpen: boolean;
  onClose: () => void;
  /** ログイン・会員登録後に戻るURL */
  returnTo?: string;
  /** LINE連携済みかどうか。false の場合、完了後に LINE CTAを表示する */
  lineLinked?: boolean;
}

interface CompanyEntryModalPropsJob extends CompanyEntryModalPropsBase {
  variant?: "job";
  jobs: EntryModalJob[];
  sessionDates?: never;
  /** エントリー済み求人ID一覧。指定時はモーダル内で再取得せずこれを使用する（親で取得してからモーダルを開く想定） */
  initialAppliedJobIds?: string[];
}

interface CompanyEntryModalPropsSession extends CompanyEntryModalPropsBase {
  variant: "session";
  sessionDates: EntryModalSessionDate[];
  jobs?: never;
  /** 予約済み日程ID一覧。指定時はモーダル内で再取得せずこれを使用する（親でページロード時に取得してから渡す想定） */
  initialReservedSessionDateIds?: string[];
  /** モーダルを開いた際に最初から選択済みにする日程ID */
  initialSelectedSessionDateId?: string;
}

export type CompanyEntryModalProps = CompanyEntryModalPropsJob | CompanyEntryModalPropsSession;

export default function CompanyEntryModal(props: CompanyEntryModalProps) {
  const { isOpen, onClose, returnTo = "/", lineLinked } = props;
  const isJob = props.variant !== "session";
  const jobs = isJob ? (props as CompanyEntryModalPropsJob).jobs : [];
  const initialAppliedJobIds = isJob ? (props as CompanyEntryModalPropsJob).initialAppliedJobIds : undefined;
  const sessionDates = !isJob ? (props as CompanyEntryModalPropsSession).sessionDates : [];
  const initialReservedSessionDateIds = !isJob
    ? (props as CompanyEntryModalPropsSession).initialReservedSessionDateIds
    : undefined;
  const initialSelectedSessionDateId = !isJob
    ? (props as CompanyEntryModalPropsSession).initialSelectedSessionDateId
    : undefined;

  const { classes, theme } = useMainTheme();
  const auth = useHeaderAuth();
  const user = auth?.user ?? null;
  const role = auth?.role ?? null;
  const isGuest = !user;
  const isNonCandidate = user && role !== null && role !== "candidate";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSessionDateId, setSelectedSessionDateId] = useState<string | null>(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [reservedSessionDateIds, setReservedSessionDateIds] = useState<string[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  usePreventScrollOnOverlay(overlayRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSelectedSessionDateId(initialSelectedSessionDateId ?? null);
      setEntryError(null);
      setEntrySuccess(false);
      if (isJob && initialAppliedJobIds !== undefined) {
        setAppliedJobIds(initialAppliedJobIds);
      }
      if (!isJob) {
        setReservedSessionDateIds(initialReservedSessionDateIds ?? []);
      }
    }
  }, [isOpen, isJob, initialAppliedJobIds]);

  useEffect(() => {
    if (!isOpen || !isJob || jobs.length === 0 || initialAppliedJobIds !== undefined) return;
    getAppliedJobIdsForCurrentCandidate(jobs.map((j) => j.id)).then(({ data }) => {
      setAppliedJobIds(data ?? []);
    });
  }, [isOpen, isJob, jobs, initialAppliedJobIds]);

  useEffect(() => {
    if (!isOpen || isJob || sessionDates.length === 0 || initialReservedSessionDateIds !== undefined) return;
    getReservedSessionDateIdsForCurrentCandidate(sessionDates.map((d) => d.id)).then(({ data }) => {
      setReservedSessionDateIds(data ?? []);
    });
  }, [isOpen, isJob, sessionDates, initialReservedSessionDateIds]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const toggleJob = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEntryClick = async () => {
    if (selectedIds.size === 0) return;
    setEntrySubmitting(true);
    setEntryError(null);
    const { data, error } = await createApplicationsForCandidate(Array.from(selectedIds));
    setEntrySubmitting(false);
    if (error) {
      setEntryError(error);
      return;
    }
    if (data) {
      if (data.alreadyApplied.length > 0 && data.created.length === 0) {
        setEntryError("選択した求人はすべて既にエントリー済みです");
        return;
      }
      setAppliedJobIds((prev) => [...new Set([...prev, ...data.created])]);
      setEntrySuccess(true);
      if (lineLinked !== false) setTimeout(() => onClose(), 1500);
    }
  };

  const handleSessionReservationClick = async () => {
    if (!selectedSessionDateId) return;
    setEntrySubmitting(true);
    setEntryError(null);
    const { data, error } = await createSessionReservationForLoggedInCandidate(selectedSessionDateId);
    setEntrySubmitting(false);
    if (error) {
      setEntryError(error);
      return;
    }
    if (data) {
      setReservedSessionDateIds((prev) => [...new Set([...prev, selectedSessionDateId])]);
      setEntrySuccess(true);
      if (lineLinked !== false) setTimeout(() => onClose(), 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className={cn(
          "absolute inset-0 overflow-hidden animate-in fade-in duration-200",
          theme === "dark" ? "bg-black/80" : "bg-black/60"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-modal-title"
        className={cn(
          "relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
          theme === "dark" ? "bg-gray-900 border border-gray-700" : cn(classes.cardBg, classes.cardBorder)
        )}
      >
        {/* ヘッダー */}
        <div
          className={cn("flex items-center justify-between flex-shrink-0 px-4 py-3 border-b", classes.sectionBorder)}
        >
          <h2 id="entry-modal-title" className={cn("text-lg font-bold", classes.textPrimary)}>
            {isJob ? "エントリーする求人を選択" : "参加予約する日程を選択"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-current opacity-80" />
          </button>
        </div>

        {/* 未ログイン: ログイン促進 */}
        {isGuest && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col items-center justify-center gap-6 py-8">
            <p className={cn("text-center text-sm", classes.textPrimary)}>
              {isJob ? (
                <>
                  ログインすると、
                  <br />
                  人気・優良企業の求人にエントリーできるようになります。
                </>
              ) : (
                <>
                  ログインすると、
                  <br />
                  説明会に参加予約できるようになります。
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <Link
                href={`/auth/login?next=${encodeURIComponent(returnTo)}`}
                className={cn(
                  "flex-1 py-3 rounded-md font-bold text-sm text-center transition-all",
                  "bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white"
                )}
              >
                ログイン
              </Link>
              <Link
                href={`/auth/signup?next=${encodeURIComponent(returnTo)}`}
                className={cn(
                  "flex-1 py-3 rounded-md font-bold text-sm text-center border",
                  classes.cardBorder,
                  classes.textPrimary
                )}
              >
                会員登録
              </Link>
            </div>
          </div>
        )}

        {/* 学生以外: 一覧表示のみ・エントリー/予約不可 */}
        {!isGuest && isNonCandidate && (
          <>
            <div
              className={cn(
                "px-4 py-2 text-sm text-center",
                classes.textMuted,
                "bg-amber-500/10 border-b border-amber-500/20"
              )}
            >
              {isJob
                ? "求職者アカウントではないためエントリーできません"
                : "求職者アカウントではないため予約できません"}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isJob && jobs.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>募集中の求人がありません</p>
              ) : !isJob && sessionDates.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>予約可能な日程がありません</p>
              ) : isJob ? (
                <ul className="space-y-3">
                  {jobs.map((job) => (
                    <li
                      key={job.id}
                      className={cn(
                        "w-full rounded-lg overflow-hidden border p-3 flex gap-3 opacity-90",
                        classes.cardBg,
                        classes.cardBorder
                      )}
                    >
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                        {job.coverImage ? (
                          <Image src={job.coverImage} alt={job.title} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="w-full h-full bg-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {job.graduationYear && (
                            <span className="px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] font-bold rounded">
                              {job.graduationYear}
                            </span>
                          )}
                          {job.prefecture && (
                            <span className="px-1.5 py-0.5 bg-gray-600/80 text-white text-[10px] font-bold rounded">
                              {job.prefecture}
                            </span>
                          )}
                          {job.employmentType && (
                            <span className="px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] font-bold rounded">
                              {job.employmentType}
                            </span>
                          )}
                        </div>
                        <h3 className={cn("text-sm font-bold line-clamp-2", classes.textPrimary)}>{job.title}</h3>
                        {job.location && (
                          <p className={cn("flex items-center gap-1 mt-1 text-xs", classes.textMuted)}>
                            <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden />
                            <span className="line-clamp-1">{job.location}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {sessionDates.map((d) => (
                    <li
                      key={d.id}
                      className={cn(
                        "w-full rounded-lg border p-3 flex gap-3 opacity-90",
                        classes.cardBg,
                        classes.cardBorder
                      )}
                    >
                      <Calendar className="w-5 h-5 flex-shrink-0 text-gray-400 mt-0.5" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-bold", classes.textPrimary)}>{d.date}</p>
                        <p className={cn("text-xs mt-0.5", classes.textMuted)}>{d.time}</p>
                        {d.capacity != null && (
                          <p className={cn("text-xs mt-1", classes.textMuted)}>定員: {d.capacity}名</p>
                        )}
                        {d.status === "満員" && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-gray-500 text-white text-xs font-bold rounded">
                            満員
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={cn("flex-shrink-0 px-4 py-3 border-t", classes.sectionBorder)}>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "w-full py-3 rounded-md font-bold text-sm border",
                  classes.cardBorder,
                  classes.textPrimary
                )}
              >
                閉じる
              </button>
            </div>
          </>
        )}

        {/* 学生（candidate）: 求人選択・エントリー または 日程選択・予約 */}
        {!isGuest && !isNonCandidate && (
          <>
            {entrySuccess && lineLinked === false ? (
              <>
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
                  <div className={cn("text-base font-bold", "text-green-700 dark:text-green-400")}>
                    {isJob ? "エントリー完了！" : "予約完了！"}
                  </div>
                  <p className={cn("text-sm", classes.textMuted)}>
                    LINEと連携すると選考に関する情報をLINEでお知らせします。
                  </p>
                </div>
                <div className={cn("flex-shrink-0 flex gap-3 px-4 py-3 border-t", classes.sectionBorder)}>
                  <Link
                    href="/api/line/authorize"
                    className="flex-1 py-3 rounded-md font-bold text-sm text-center bg-[#06C755] hover:bg-[#05b34d] text-white transition-colors"
                  >
                    LINEと連携する
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn("flex-1 py-3 rounded-md font-bold text-sm border", classes.cardBorder, classes.textPrimary)}
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : entrySuccess ? (
              <div
                className={cn(
                  "flex-1 flex items-center justify-center px-4 py-8 text-center text-base font-bold",
                  "bg-green-500/10 text-green-700 dark:text-green-400",
                  theme === "dark" ? "border-green-500/30" : "border-green-200"
                )}
                role="status"
              >
                {isJob ? "エントリー完了" : "予約完了"}
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isJob && jobs.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>募集中の求人がありません</p>
              ) : !isJob && sessionDates.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>予約可能な日程がありません</p>
              ) : isJob ? (
                <ul className="space-y-3">
                  {(() => {
                    const sortedJobs = [
                      ...jobs.filter((j) => !appliedJobIds.includes(j.id)),
                      ...jobs.filter((j) => appliedJobIds.includes(j.id))
                    ];
                    return sortedJobs.map((job) => {
                      const isApplied = appliedJobIds.includes(job.id);
                      const isSelected = selectedIds.has(job.id);
                      return (
                        <li key={job.id}>
                          {isApplied ? (
                            <div
                              className={cn(
                                "w-full rounded-lg overflow-hidden border-2 border-transparent p-3 flex gap-3 items-center opacity-70",
                                theme === "dark" ? "bg-gray-800/50" : "bg-gray-100",
                                classes.cardBorder
                              )}
                            >
                              <div className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center bg-gray-400 border-gray-400" />
                              <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                                {job.coverImage ? (
                                  <Image src={job.coverImage} alt={job.title} fill className="object-cover" sizes="64px" />
                                ) : (
                                  <div className="w-full h-full bg-gray-300" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-1.5 mb-1 items-center">
                                  <span className="px-2 py-0.5 bg-gray-500 text-white text-[10px] font-bold rounded">
                                    エントリー済み
                                  </span>
                                  {job.graduationYear && (
                                    <span className="px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] font-bold rounded">
                                      {job.graduationYear}
                                    </span>
                                  )}
                                  {job.prefecture && (
                                    <span className="px-1.5 py-0.5 bg-gray-600/80 text-white text-[10px] font-bold rounded">
                                      {job.prefecture}
                                    </span>
                                  )}
                                  {job.employmentType && (
                                    <span className="px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] font-bold rounded">
                                      {job.employmentType}
                                    </span>
                                  )}
                                </div>
                                <h3 className={cn("text-sm font-bold line-clamp-2", classes.textPrimary)}>{job.title}</h3>
                                {job.location && (
                                  <p className={cn("flex items-center gap-1 mt-1 text-xs", classes.textMuted)}>
                                    <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden />
                                    <span className="line-clamp-1">{job.location}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleJob(job.id)}
                              className={cn(
                                "w-full text-left rounded-lg overflow-hidden transition-all border-2",
                                classes.cardBg,
                                classes.cardBorder,
                                isSelected
                                  ? "border-red-500 ring-2 ring-red-500/30"
                                  : "border-transparent hover:border-gray-400"
                              )}
                            >
                              <div className="flex gap-3 p-3 items-center">
                                <div
                                  className={cn(
                                    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center",
                                    isSelected ? "bg-red-600 border-red-600" : classes.cardBorder
                                  )}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                                  {job.coverImage ? (
                                    <Image src={job.coverImage} alt={job.title} fill className="object-cover" sizes="64px" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-300" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap gap-1.5 mb-1">
                                    {job.graduationYear && (
                                      <span className="px-1.5 py-0.5 bg-red-600/80 text-white text-[10px] font-bold rounded">
                                        {job.graduationYear}
                                      </span>
                                    )}
                                    {job.prefecture && (
                                      <span className="px-1.5 py-0.5 bg-gray-600/80 text-white text-[10px] font-bold rounded">
                                        {job.prefecture}
                                      </span>
                                    )}
                                    {job.employmentType && (
                                      <span className="px-1.5 py-0.5 bg-blue-600/80 text-white text-[10px] font-bold rounded">
                                        {job.employmentType}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className={cn("text-sm font-bold line-clamp-2", classes.textPrimary)}>{job.title}</h3>
                                  {job.location && (
                                    <p className={cn("flex items-center gap-1 mt-1 text-xs", classes.textMuted)}>
                                      <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden />
                                      <span className="line-clamp-1">{job.location}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          )}
                        </li>
                      );
                    });
                  })()}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {[
                    ...sessionDates.filter((d) => !reservedSessionDateIds.includes(d.id)),
                    ...sessionDates.filter((d) => reservedSessionDateIds.includes(d.id))
                  ].map((d) => {
                    const isReserved = reservedSessionDateIds.includes(d.id);
                    const canSelect = !isReserved && d.status === "受付中" && !!d.id;
                    const isSelected = selectedSessionDateId === d.id;
                    return (
                      <li key={d.id}>
                        {isReserved ? (
                          <div
                            className={cn(
                              "w-full rounded-lg border-2 border-transparent p-3 flex items-center gap-3 opacity-70",
                              theme === "dark" ? "bg-gray-800/50" : "bg-gray-100",
                              classes.cardBorder
                            )}
                          >
                            <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-gray-400 border-gray-400" />
                            <Calendar className="w-5 h-5 flex-shrink-0 text-gray-400" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap gap-1.5 mb-1 items-center">
                                <span className="px-2 py-0.5 bg-gray-500 text-white text-[10px] font-bold rounded">
                                  予約済み
                                </span>
                              </div>
                              <p className={cn("text-sm font-bold", classes.textPrimary)}>{d.date}</p>
                              <p className={cn("text-xs mt-0.5", classes.textMuted)}>{d.time}</p>
                              {d.capacity != null && (
                                <p className={cn("text-xs mt-1", classes.textMuted)}>定員: {d.capacity}名</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canSelect}
                            onClick={() => canSelect && setSelectedSessionDateId(d.id)}
                            className={cn(
                              "w-full text-left rounded-lg overflow-hidden transition-all border-2 p-3 flex items-center gap-3",
                              classes.cardBg,
                              canSelect ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                              isSelected ? "border-red-500 ring-2 ring-red-500/30" : "border-transparent",
                              canSelect && !isSelected && "hover:border-gray-400"
                            )}
                          >
                            <div
                              className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                isSelected ? "bg-red-600 border-red-600" : classes.cardBorder
                              )}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <Calendar className="w-5 h-5 flex-shrink-0 text-gray-400" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-sm font-bold", classes.textPrimary)}>{d.date}</p>
                              <p className={cn("text-xs mt-0.5", classes.textMuted)}>{d.time}</p>
                              {d.capacity != null && (
                                <p className={cn("text-xs mt-1", classes.textMuted)}>定員: {d.capacity}名</p>
                              )}
                              {d.status === "満員" && (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-gray-500 text-white text-xs font-bold rounded">
                                  満員
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            )}

            {!entrySuccess && entryError && (
              <div
                className={cn(
                  "flex-shrink-0 px-4 py-2 text-sm text-center",
                  "bg-red-500/10 text-red-600 dark:text-red-400 border-t",
                  theme === "dark" ? "border-red-500/30" : "border-red-200"
                )}
                role="alert"
              >
                {entryError}
              </div>
            )}

            {!entrySuccess && (
            <div className={cn("flex-shrink-0 flex gap-3 px-4 py-3 border-t", classes.sectionBorder)}>
              <button
                type="button"
                onClick={onClose}
                disabled={entrySubmitting}
                className={cn(
                  "flex-1 py-3 rounded-md font-bold text-sm border",
                  classes.cardBorder,
                  classes.textPrimary,
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                キャンセル
              </button>
              {isJob ? (
                <button
                  type="button"
                  onClick={handleEntryClick}
                  disabled={selectedIds.size === 0 || entrySubmitting}
                  className="flex-1 py-3 rounded-md font-bold text-sm bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white transition-colors duration-150 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {entrySubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      送信中
                    </>
                  ) : (
                    <>選択した求人にエントリー（{selectedIds.size}件）</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSessionReservationClick}
                  disabled={!selectedSessionDateId || entrySubmitting}
                  className={cn(
                    "flex-1 py-3 rounded-md font-bold text-sm transition-colors duration-150 active:opacity-90 flex items-center justify-center gap-2",
                    selectedSessionDateId && !entrySubmitting
                      ? "bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {entrySubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      送信中
                    </>
                  ) : (
                    "参加予約する"
                  )}
                </button>
              )}
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
