"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, MapPin, Calendar } from "lucide-react";
import { useHeaderAuth } from "@/components/header/HeaderAuthContext";
import { useMainTheme } from "./CompanyPageThemeContext";
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
}

interface CompanyEntryModalPropsJob extends CompanyEntryModalPropsBase {
  variant?: "job";
  jobs: EntryModalJob[];
  sessionDates?: never;
}

interface CompanyEntryModalPropsSession extends CompanyEntryModalPropsBase {
  variant: "session";
  sessionDates: EntryModalSessionDate[];
  jobs?: never;
}

export type CompanyEntryModalProps = CompanyEntryModalPropsJob | CompanyEntryModalPropsSession;

export default function CompanyEntryModal(props: CompanyEntryModalProps) {
  const { isOpen, onClose, returnTo = "/" } = props;
  const isJob = props.variant !== "session";
  const jobs = isJob ? (props as CompanyEntryModalPropsJob).jobs : [];
  const sessionDates = !isJob ? (props as CompanyEntryModalPropsSession).sessionDates : [];

  const { classes, theme } = useMainTheme();
  const auth = useHeaderAuth();
  const user = auth?.user ?? null;
  const role = auth?.role ?? null;
  const isGuest = !user;
  const isNonCandidate = user && role !== null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSessionDateId, setSelectedSessionDateId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  usePreventScrollOnOverlay(overlayRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSelectedSessionDateId(null);
    }
  }, [isOpen]);

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

  const handleEntryClick = () => {
    // ガワのみ：今後エントリー処理を実装する
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
                          <Image src={job.coverImage} alt="" fill className="object-cover" sizes="64px" />
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
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isJob && jobs.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>募集中の求人がありません</p>
              ) : !isJob && sessionDates.length === 0 ? (
                <p className={cn("py-8 text-center text-sm", classes.textMuted)}>予約可能な日程がありません</p>
              ) : isJob ? (
                <ul className="space-y-3">
                  {jobs.map((job) => {
                    const isSelected = selectedIds.has(job.id);
                    return (
                      <li key={job.id}>
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
                          <div className="flex gap-3 p-3">
                            <div
                              className={cn(
                                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
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
                                <Image src={job.coverImage} alt="" fill className="object-cover" sizes="64px" />
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
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {sessionDates.map((d) => {
                    const canSelect = d.status === "受付中" && !!d.id;
                    const isSelected = selectedSessionDateId === d.id;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          disabled={!canSelect}
                          onClick={() => canSelect && setSelectedSessionDateId(d.id)}
                          className={cn(
                            "w-full text-left rounded-lg overflow-hidden transition-all border-2 p-3 flex gap-3",
                            classes.cardBg,
                            canSelect ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                            isSelected ? "border-red-500 ring-2 ring-red-500/30" : "border-transparent",
                            canSelect && !isSelected && "hover:border-gray-400"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                              isSelected ? "bg-red-600 border-red-600" : classes.cardBorder
                            )}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={cn("flex-shrink-0 flex gap-3 px-4 py-3 border-t", classes.sectionBorder)}>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "flex-1 py-3 rounded-md font-bold text-sm border",
                  classes.cardBorder,
                  classes.textPrimary
                )}
              >
                キャンセル
              </button>
              {isJob ? (
                <button
                  type="button"
                  onClick={handleEntryClick}
                  disabled={selectedIds.size === 0}
                  className="flex-1 py-3 rounded-md font-bold text-sm bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white transition-colors duration-150 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  選択した求人にエントリー（{selectedIds.size}件）
                </button>
              ) : (
                <Link
                  href={
                    selectedSessionDateId
                      ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}sessionDateId=${encodeURIComponent(selectedSessionDateId)}`
                      : "#"
                  }
                  onClick={(e) => !selectedSessionDateId && e.preventDefault()}
                  className={cn(
                    "flex-1 py-3 rounded-md font-bold text-sm text-center transition-colors duration-150 active:opacity-90",
                    selectedSessionDateId
                      ? "bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none"
                  )}
                >
                  参加予約する
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
