"use client";

import { useState, useEffect, lazy, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  createPublicEventReservation,
  createReservationForExistingCandidate,
  signUpAndReserveEvent,
  type EventForReservation,
} from "@/lib/actions/event-reservation-actions";
import { checkEmailForSignup } from "@/lib/actions/auth-actions";
import { validateEmail } from "@/lib/utils/signup-validation";
import { primaryButtonClass } from "@/constants/navigation";
import { Loader2 } from "lucide-react";
import EventDateSection from "./EventDateSection";
import ExistingCandidateConfirm from "./ExistingCandidateConfirm";
import { cn } from "@jobtv-app/shared/utils/cn";
import TurnstileWidget from "@/components/common/TurnstileWidget";

const SignupFields = lazy(() => import("./SignupFields"));

const inputClass =
  "w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all";
const inputErrorClass = "border-red-500 bg-red-50/50";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const fieldErrorClass = "mt-0.5 text-xs text-red-600";

interface Props {
  events: EventForReservation[];
  isLoggedInCandidate: boolean;
  loggedInEmail?: string | null;
}

export default function EventEntryForm({ events, isLoggedInCandidate, loggedInEmail }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 共通 state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [webConsultation, setWebConsultation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // メール入力（未ログイン時のみ）
  const [emailInput, setEmailInput] = useState("");
  const [emailForSignup, setEmailForSignup] = useState("");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // メールチェック結果
  const [existingCandidate, setExistingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState(false);
  const confirmed = existingCandidate || newCandidate;

  // イベント選択時にエラーをクリア
  function handleSelectEvent(id: string) {
    setSelectedEventId(id);
    setError(null);
  }

  // Turnstile token（既存候補者の手動予約用）
  const [captchaToken, setCaptchaToken] = useState("");

  // UTM
  const [referrer, setReferrer] = useState("");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", content: "", term: "" });

  // Phase 7: メールチェック先読みキャッシュ
  const emailCheckCache = useRef<Map<string, Awaited<ReturnType<typeof checkEmailForSignup>>>>(new Map());

  useEffect(() => {
    if (typeof document !== "undefined") setReferrer(document.referrer ?? "");
    setUtm({
      source: searchParams.get("utm_source") ?? "",
      medium: searchParams.get("utm_medium") ?? "",
      campaign: searchParams.get("utm_campaign") ?? "",
      content: searchParams.get("utm_content") ?? "",
      term: searchParams.get("utm_term") ?? "",
    });
  }, [searchParams]);

  // Phase 7: blur 時にメールチェックを先読み
  const prefetchEmailCheck = useCallback((email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || validateEmail(trimmed) || emailCheckCache.current.has(trimmed)) return;
    checkEmailForSignup(trimmed).then((result) => {
      emailCheckCache.current.set(trimmed, result);
    }).catch(() => { /* prefetch failure is non-critical */ });
  }, []);

  // ログイン済み candidate: 日程選択 → 予約
  async function handleLoggedInSubmit() {
    if (!selectedEventId) {
      setError("イベント日程を選択してください");
      return;
    }
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("event_id", selectedEventId);
    fd.set("web_consultation", String(webConsultation));
    fd.set("referrer", referrer);
    fd.set("utm_source", utm.source);
    fd.set("utm_medium", utm.medium);
    fd.set("utm_campaign", utm.campaign);
    fd.set("utm_content", utm.content);
    fd.set("utm_term", utm.term);

    const result = await createPublicEventReservation(fd);

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    router.push(`/event/entry/thanks?event_id=${result.data!.eventId}`);
  }

  // 未ログイン: メールチェック
  async function handleEmailNext() {
    if (!selectedEventId) {
      setError("イベント日程を選択してください");
      return;
    }
    const email = emailInput.trim();
    const err = validateEmail(email);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, email: err }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, email: "" }));
    setError(null);
    setCheckError(null);
    setLoadingCheck(true);

    // Phase 7: キャッシュがあればそれを使う
    const cached = emailCheckCache.current.get(email.toLowerCase());
    const result = cached ?? await checkEmailForSignup(email);
    setLoadingCheck(false);

    if (result.status === "error") {
      setCheckError(result.error);
      return;
    }
    setEmailForSignup(email);

    if (result.status === "available") {
      setNewCandidate(true);
      return;
    }
    if (result.status === "candidate_exists") {
      setExistingCandidate(true);
      return;
    }
    if (result.status === "recruiter_or_admin_exists") {
      setCheckError("このメールアドレスでは登録できません。別のメールアドレスをお試しください。");
    }
  }

  // 未ログイン: 既存候補者 → 予約確定
  async function handleExistingCandidateReserve() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", emailForSignup);
    fd.set("event_id", selectedEventId);
    fd.set("web_consultation", String(webConsultation));
    fd.set("referrer", referrer);
    fd.set("utm_source", utm.source);
    fd.set("utm_medium", utm.medium);
    fd.set("utm_campaign", utm.campaign);
    fd.set("utm_content", utm.content);
    fd.set("utm_term", utm.term);
    fd.set("captchaToken", captchaToken);
    const reserveResult = await createReservationForExistingCandidate(fd);
    if (reserveResult.error) {
      setLoading(false);
      setError(reserveResult.error);
      return;
    }
    router.push(`/event/entry/thanks?event_id=${reserveResult.data!.eventId}`);
  }

  // 未ログイン: 会員登録 + 予約
  async function handleSignupAndReserve(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUpAndReserveEvent(formData);

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    router.push(`/event/entry/thanks?event_id=${result.data!.eventId}`);
  }

  const utmHiddenInputs = (
    <>
      <input type="hidden" name="referrer" value={referrer} />
      <input type="hidden" name="utm_source" value={utm.source} />
      <input type="hidden" name="utm_medium" value={utm.medium} />
      <input type="hidden" name="utm_campaign" value={utm.campaign} />
      <input type="hidden" name="utm_content" value={utm.content} />
      <input type="hidden" name="utm_term" value={utm.term} />
    </>
  );

  // ============================================================
  // ログイン済み candidate フロー
  // ============================================================
  if (isLoggedInCandidate) {
    return (
      <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
        <div className="space-y-6">
          <EventDateSection
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
            webConsultation={webConsultation}
            onWebConsultationChange={setWebConsultation}
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
          )}

          {loggedInEmail && (
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium text-gray-900">{loggedInEmail}</span> でログイン中
            </p>
          )}

          <button
            type="button"
            onClick={handleLoggedInSubmit}
            disabled={loading}
            className={cn(
              "mx-auto block w-auto min-w-[12rem] px-8 py-4 text-sm rounded-lg font-medium",
              primaryButtonClass,
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                予約中...
              </span>
            ) : (
              "予約する"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // 未ログインフロー
  // ============================================================
  return (
    <form action={newCandidate ? handleSignupAndReserve : undefined} className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
      {newCandidate && (
        <>
          {utmHiddenInputs}
          <input type="hidden" name="email" value={emailForSignup} />
          <input type="hidden" name="event_id" value={selectedEventId} />
          <input type="hidden" name="web_consultation" value={String(webConsultation)} />
        </>
      )}
      <div className="space-y-6">
            <EventDateSection
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={handleSelectEvent}
              webConsultation={webConsultation}
              onWebConsultationChange={setWebConsultation}
              disabled={confirmed}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                {confirmed && (
                  <button
                    type="button"
                    onClick={() => { setExistingCandidate(false); setNewCandidate(false); setError(null); setCheckError(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    変更
                  </button>
                )}
              </div>
              <input
                type="email"
                id="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }));
                }}
                onBlur={(e) => {
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }));
                  prefetchEmailCheck(e.target.value);
                }}
                disabled={confirmed}
                className={cn(inputClass, fieldErrors.email && inputErrorClass, confirmed && "opacity-60")}
                placeholder="example@jobtv.jp"
              />
              {fieldErrors.email && <p className={fieldErrorClass}>{fieldErrors.email}</p>}
            </div>

            {checkError && <p className={fieldErrorClass}>{checkError}</p>}
            {error && !newCandidate && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
            )}

            {existingCandidate && (
              <ExistingCandidateConfirm loading={loading} onReserve={handleExistingCandidateReserve} />
            )}

            {!confirmed && (
              <TurnstileWidget theme="light" action="event-entry" onToken={setCaptchaToken} />
            )}

            {!confirmed && (
              <button
                type="button"
                onClick={handleEmailNext}
                disabled={loadingCheck}
                className={cn(
                  "mx-auto block w-auto min-w-[12rem] px-8 py-4 text-sm rounded-lg font-medium",
                  primaryButtonClass,
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loadingCheck ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    確認中...
                  </span>
                ) : (
                  "次へ"
                )}
              </button>
            )}

            {/* 新規会員登録フォーム（遅延ロード） */}
            {newCandidate && (
              <Suspense fallback={<div className="py-8 text-center text-gray-400 text-sm">読み込み中...</div>}>
                <SignupFields loading={loading} error={error} />
              </Suspense>
            )}
      </div>
    </form>
  );
}
