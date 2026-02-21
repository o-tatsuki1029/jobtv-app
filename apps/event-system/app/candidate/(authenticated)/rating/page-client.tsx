"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/ui/table/Table";
import CandidateRatingModal from "@/components/ui/modals/CandidateRatingModal";
import { useModal } from "@/hooks/useModal";
import { FormField } from "@/components/ui/form/FormField";
import { SelectInput } from "@/components/ui/form/FormField";
import { formatEventDisplay } from "@/utils/data/event";
import { Event } from "@/types/event.types";

type CompanyRating = {
  id: string;
  company_id: string;
  name: string;
  event_id: string;
  event_name: string;
  rating: number | null;
  comment: string | null;
};

type Candidate = {
  id: string;
  last_name: string;
  first_name: string;
  email: string;
};

type InitialData = {
  candidateId: string;
  eventId: string | null;
  candidate: {
    id: string;
    name: string;
    email: string | null;
    seatNumber: string | null;
  };
  events: Event[];
  companies: CompanyRating[];
  selectedEventId: string | null;
};

type CandidateRatingPageClientProps = {
  loggedInCandidateId?: string;
  isAdmin?: boolean;
  initialData?: InitialData | null;
};

function CandidateRatingPageClient({
  loggedInCandidateId,
  isAdmin = false,
  initialData = null,
}: CandidateRatingPageClientProps) {
  // クッキーからcandidate_idを取得（クライアント側）
  const [cookieCandidateId, setCookieCandidateId] = useState<string>(
    initialData?.candidateId || ""
  );
  const [cookieEventId, setCookieEventId] = useState<string>(
    initialData?.eventId || ""
  );

  // 管理者用: テスト用の学生選択
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    loggedInCandidateId || ""
  );
  const ratingModal = useModal();

  const [events, setEvents] = useState<Event[]>(initialData?.events || []);
  const [companies, setCompanies] = useState<CompanyRating[]>(
    initialData?.companies || []
  );
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialData?.selectedEventId || ""
  );
  const [selectedCompany, setSelectedCompany] = useState<CompanyRating | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // 学生情報（名前と席番号）
  const [candidateName, setCandidateName] = useState<string>(
    initialData?.candidate.name || ""
  );
  const [seatNumber, setSeatNumber] = useState<string | null>(
    initialData?.candidate.seatNumber || null
  );

  // 重複実行を防ぐためのフラグ
  const eventsFetchedRef = useRef(!!initialData?.events.length);
  const companiesFetchedRef = useRef<string | null>(
    initialData?.selectedEventId || null
  );

  const fetchCandidates = useCallback(async () => {
    if (!isAdmin) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("candidates")
      .select("id, last_name, first_name, email")
      .order("last_name_kana");

    if (error) {
      console.error("学生取得エラー:", error);
      return;
    }

    setCandidates(data || []);
  }, [isAdmin]);

  // クッキーからcandidate_idとevent_idを取得（APIルート経由、httpOnlyクッキーのため）
  // 初期データがある場合はスキップ
  // CSRFトークンを取得
  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        const data = await response.json();
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("CSRFトークン取得エラー:", error);
      }
    };
    fetchCSRFToken();
  }, []);

  useEffect(() => {
    if (!isAdmin && !initialData) {
      const fetchSession = async () => {
        try {
          const [sessionResponse, infoResponse] = await Promise.all([
            fetch("/api/candidate/session"),
            fetch("/api/candidate/info"),
          ]);

          const sessionData = await sessionResponse.json();
          const infoData = await infoResponse.json();

          if (sessionResponse.ok) {
            console.log("セッション情報を取得:", sessionData);

            if (sessionData.candidateId) {
              setCookieCandidateId(sessionData.candidateId);
            }
            if (sessionData.eventId) {
              setCookieEventId(sessionData.eventId);
              // 学生の場合は即座にselectedEventIdに設定
              console.log(
                "クッキーからイベントIDを取得、selectedEventIdに設定:",
                sessionData.eventId
              );
              setSelectedEventId(sessionData.eventId);
            }
          }

          if (infoResponse.ok && infoData.candidate) {
            setCandidateName(infoData.candidate.name || "");
            setSeatNumber(infoData.candidate.seatNumber || null);
          }
        } catch (error) {
          console.error("セッション情報取得エラー:", error);
        }
      };

      fetchSession();
    }
  }, [isAdmin, initialData]);

  const fetchEvents = useCallback(async () => {
    // 既に実行済みの場合はスキップ
    if (eventsFetchedRef.current) {
      return;
    }

    // クッキーから取得したIDを優先、なければpropsから
    const candidateId = isAdmin
      ? selectedCandidateId
      : cookieCandidateId || loggedInCandidateId;
    if (!candidateId) {
      return;
    }

    eventsFetchedRef.current = true;
    setIsLoading(true);
    try {
      // APIルート経由で取得（RLS回避）
      const response = await fetch(
        `/api/candidate/events?candidateId=${candidateId}`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error("イベント取得エラー:", data.error);
        eventsFetchedRef.current = false; // エラー時はリセット
        setIsLoading(false);
        return;
      }

      setEvents(data.events || []);
    } catch (error) {
      console.error("予期しないエラー:", error);
      eventsFetchedRef.current = false; // エラー時はリセット
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, selectedCandidateId, loggedInCandidateId, cookieCandidateId]);

  const fetchCompanies = useCallback(
    async (eventId: string) => {
      // 同じイベントIDで既に実行済みの場合はスキップ
      if (companiesFetchedRef.current === eventId) {
        return;
      }

      // クッキーから取得したIDを優先、なければpropsから
      const candidateId = isAdmin
        ? selectedCandidateId
        : cookieCandidateId || loggedInCandidateId;
      if (!candidateId || !eventId) {
        setCompanies([]);
        companiesFetchedRef.current = null;
        return;
      }

      companiesFetchedRef.current = eventId;
      setIsLoading(true);
      try {
        // APIルート経由で取得（RLS回避）
        const response = await fetch(
          `/api/candidate/companies?eventId=${eventId}&candidateId=${candidateId}`
        );
        const data = await response.json();

        if (!response.ok) {
          console.error("企業取得エラー:", data.error);
          companiesFetchedRef.current = null; // エラー時はリセット
          setCompanies([]);
          setIsLoading(false);
          return;
        }

        // イベント名を取得（eventsから、またはAPIレスポンスから）
        // eventsがまだ読み込まれていない場合は、後で更新する
        const event = events.find((e) => e.id === eventId);
        const eventName = event ? formatEventDisplay(event) : ""; // イベント名が取得できない場合は空文字

        // イベント名を追加
        type CompanyItem = {
          id: string;
          name: string;
          rating?: number;
          comment?: string | null;
        };
        const formattedCompanies: CompanyRating[] = (data.companies || []).map(
          (company: CompanyItem) => ({
            ...company,
            event_name: eventName,
          })
        );

        setCompanies(formattedCompanies);
      } catch (error) {
        console.error("予期しないエラー:", error);
        companiesFetchedRef.current = null; // エラー時はリセット
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isAdmin,
      selectedCandidateId,
      loggedInCandidateId,
      cookieCandidateId,
      events,
    ]
  );

  useEffect(() => {
    if (isAdmin) {
      fetchCandidates();
    }
  }, [isAdmin, fetchCandidates]);

  useEffect(() => {
    // 初期データがある場合はスキップ
    if (initialData?.events.length) {
      return;
    }
    // 管理者の場合はselectedCandidateIdが設定されている場合のみ実行
    // 学生の場合はcookieCandidateIdまたはloggedInCandidateIdが設定されている場合のみ実行
    if (isAdmin) {
      if (!selectedCandidateId) {
        return;
      }
    } else {
      if (!cookieCandidateId && !loggedInCandidateId) {
        return;
      }
    }
    fetchEvents();
  }, [
    fetchEvents,
    isAdmin,
    cookieCandidateId,
    loggedInCandidateId,
    initialData,
    selectedCandidateId,
  ]);

  // ログイン時に選択したイベントを自動選択（学生の場合のみ）
  useEffect(() => {
    if (!isAdmin && cookieEventId && !selectedEventId) {
      // イベント一覧が読み込まれた後、クッキーのイベントIDが存在するか確認
      if (events.length > 0) {
        const eventExists = events.some((e) => e.id === cookieEventId);
        if (eventExists) {
          // イベントが存在する場合、selectedEventIdを設定
          setSelectedEventId(cookieEventId);
        }
      } else {
        // イベント一覧がまだ読み込まれていない場合でも、クッキーのイベントIDを設定
        // ただし、fetchEventsが実行されるまで待つ
        if (eventsFetchedRef.current) {
          setSelectedEventId(cookieEventId);
        }
      }
    }
  }, [cookieEventId, isAdmin, events, selectedEventId]);

  useEffect(() => {
    // 初期データがある場合はスキップ
    if (
      initialData?.companies.length &&
      initialData?.selectedEventId === selectedEventId
    ) {
      return;
    }
    if (selectedEventId) {
      // イベント一覧が読み込まれている場合のみ企業を取得
      // 学生の場合は、イベント一覧が読み込まれる前にselectedEventIdが設定される可能性があるため
      if (!isAdmin || events.length > 0) {
        fetchCompanies(selectedEventId);
      }
    } else {
      setCompanies([]);
      companiesFetchedRef.current = null;
    }
  }, [selectedEventId, fetchCompanies, isAdmin, events, initialData]);

  const handleRatingClick = (company: CompanyRating) => {
    setSelectedCompany(company);
    ratingModal.open();
  };

  const handleCloseModal = () => {
    ratingModal.close();
    setSelectedCompany(null);
  };

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: formatEventDisplay(e),
  }));

  const headers: {
    label: string;
    key: keyof CompanyRating;
    renderCell?: (value: unknown, row: CompanyRating) => React.ReactNode;
  }[] = [
    { label: "企業名", key: "name" },
    {
      label: "評価",
      key: "rating",
      renderCell: (value) => {
        if (value === null || value === undefined) {
          return <span className="text-gray-400">未評価</span>;
        }
        const rating = typeof value === "number" ? value : Number(value);
        return (
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${
                    star <= rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300 fill-gray-300"
                  }`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-600">{rating}/5</span>
          </div>
        );
      },
    },
    {
      label: "コメント",
      key: "comment",
      renderCell: (value) => {
        const commentValue = value as string;
        if (!commentValue)
          return <div className="text-xs text-gray-500">-</div>;

        try {
          const parsed = JSON.parse(commentValue);
          if (Array.isArray(parsed)) {
            return (
              <div className="text-xs text-gray-700 max-w-[200px]">
                {parsed.map((point, index) => (
                  <span key={index} className="inline-block mr-1 mb-1">
                    {point}
                  </span>
                ))}
              </div>
            );
          }
        } catch {
          // JSONでない場合は既存のコメント形式として表示
        }

        return (
          <div className="text-xs text-gray-700 max-w-[200px] whitespace-pre-wrap break-words">
            {commentValue}
          </div>
        );
      },
    },
  ];

  const candidateOptions = candidates.map((c) => ({
    value: c.id,
    label: `${c.last_name} ${c.first_name} (${c.email})`,
  }));

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">企業評価</h2>
        {isAdmin && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
            管理者プレビュー
          </span>
        )}
      </div>

      <div className="mb-4 space-y-3">
        {/* 管理者用: テスト用の学生選択・イベント選択 */}
        {isAdmin ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
            <div className="text-xs font-bold text-red-600 mb-1">
              管理者プレビューモード
            </div>
            <FormField label="テスト用: 学生を選択">
              <SelectInput
                name="candidate"
                value={selectedCandidateId}
                onChange={(e) => {
                  setSelectedCandidateId(e.target.value);
                  setEvents([]);
                  setCompanies([]);
                  setSelectedEventId("");
                  // フラグをリセットして再取得可能にする
                  eventsFetchedRef.current = false;
                  companiesFetchedRef.current = null;
                }}
                options={candidateOptions}
                placeholder="学生を選択"
              />
            </FormField>

            <FormField label="イベント">
              <SelectInput
                name="event"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                }}
                options={eventOptions}
                placeholder="イベントを選択"
                disabled={!selectedCandidateId}
              />
            </FormField>
          </div>
        ) : (
          // 学生の場合は学生名、席番号、イベント名を表示
          <div className="mb-4">
            {candidateName && (
              <div className="text-base font-medium text-gray-900 mb-1">
                {candidateName}
                {seatNumber && (
                  <span className="ml-2 text-gray-600">
                    （席番号: {seatNumber}）
                  </span>
                )}
              </div>
            )}
            {selectedEventId &&
              events.find((e) => e.id === selectedEventId) && (
                <div className="text-sm text-gray-600">
                  {formatEventDisplay(
                    events.find((e) => e.id === selectedEventId)!
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      <Table
        headers={headers}
        data={companies}
        isLoading={isLoading}
        onRowClick={(row) => {
          const candidateId = isAdmin
            ? selectedCandidateId
            : loggedInCandidateId;
          if (candidateId) {
            handleRatingClick(row as CompanyRating);
          }
        }}
      />

      {/* 評価モーダル */}
      {selectedCompany && (
        <CandidateRatingModal
          isOpen={ratingModal.isOpen}
          onClose={handleCloseModal}
          candidateId={
            isAdmin
              ? selectedCandidateId
              : cookieCandidateId || loggedInCandidateId || ""
          }
          companyId={selectedCompany.company_id}
          eventId={selectedCompany.event_id}
          candidateName={
            isAdmin
              ? candidates.find((c) => c.id === selectedCandidateId)
                  ?.last_name +
                " " +
                candidates.find((c) => c.id === selectedCandidateId)?.first_name
              : candidateName
          }
          companyName={selectedCompany.name}
          eventName={selectedCompany.event_name}
          existingRating={selectedCompany.rating}
          existingLikedPoints={(() => {
            if (!selectedCompany.comment) return null;
            try {
              const parsed = JSON.parse(selectedCompany.comment);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              // Ignore
            }
            return null;
          })()}
          isAdmin={isAdmin}
          onSuccess={async () => {
            // 一覧を更新（フラグをリセットして再取得）
            companiesFetchedRef.current = null;
            await fetchCompanies(selectedEventId);
          }}
        />
      )}
    </div>
  );
}

export default CandidateRatingPageClient;
