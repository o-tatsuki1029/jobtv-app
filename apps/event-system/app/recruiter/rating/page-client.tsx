"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/ui/table/Table";
import RecruiterRatingModal from "@/components/ui/modals/RecruiterRatingModal";
import { useModal } from "@/hooks/useModal";
import RecruiterGuide from "@/components/recruiter/RecruiterGuide";
import RefreshButton from "@/components/ui/RefreshButton";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import { FormField } from "@/components/ui/form/FormField";
import { SelectInput } from "@/components/ui/form/FormField";
import { formatEventDisplay } from "@/utils/data/event";
import { Event } from "@/types/event.types";
import { RATING_NUMBER_MAP } from "@/types/rating.types";
import type { Database } from "@/types";

type Company = {
  id: string;
  name: string;
};

type Recruiter = {
  id: string;
  company_id: string;
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  email: string;
};

type CandidateReservation = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_kana: string;
  phone: string;
  email: string;
  school_name: string;
  seat_number: string | null;
  attended: boolean;
  overall_rating: string | null;
  logic_rating: string | null;
  initiative_rating: string | null;
  cooperation_rating: string | null;
  creative_rating: string | null;
  communication_rating: string | null;
  evaluator_name: string | null;
  comment: string | null;
  memo: string | null;
  candidate_rating: number | null; // 学生からの評価（1-5）
  candidate_comment: string | null; // 学生からのコメント
  candidate_liked_points: string[] | null; // 学生が選択した「気に入ったところ」
};

const getRatingBadge = (rating: string | null) => {
  if (!rating || rating === "-" || rating === "") {
    return <span className="text-gray-400">-</span>;
  }

  // 評価グレード（"S", "A", "B", "C"）に応じた色を設定（モーダルの評価ボタンと同じ色）
  const colorMap: Record<string, { bg: string; text: string }> = {
    S: { bg: "bg-red-500", text: "text-white" },
    A: { bg: "bg-blue-600", text: "text-white" },
    B: { bg: "bg-blue-400", text: "text-white" },
    C: { bg: "bg-gray-400", text: "text-white" },
  };

  const grade = rating.toUpperCase();
  const colors = colorMap[grade] || {
    bg: "bg-gray-300",
    text: "text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${colors.bg} ${colors.text}`}
    >
      {grade}
    </span>
  );
};

const headers: {
  label: string | React.ReactNode;
  key: keyof CandidateReservation;
  renderCell?: (value: unknown, row: CandidateReservation) => React.ReactNode;
  colSpan?: number;
}[] = [
  { label: "席番号", key: "seat_number" },
  {
    label: "学生名",
    key: "candidate_name",
    renderCell: (value, row) => (
      <div>
        <div className="text-xs text-gray-500 leading-tight mb-0.5">
          {row.candidate_kana || "-"}
        </div>
        <div className="text-sm">{(value as string | null) || "-"}</div>
      </div>
    ),
  },
  { label: "大学名", key: "school_name" },
  {
    label: "総合評価",
    key: "overall_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: (
      <div className="relative group flex items-center justify-center">
        <svg
          className="w-5 h-5 text-blue-600 cursor-help"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <span className="sr-only">ロジカル</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
          ロジカル: 課題を構造的に理解・整理する能力
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    ),
    key: "logic_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: (
      <div className="relative group flex items-center justify-center">
        <svg
          className="w-5 h-5 text-red-600 cursor-help"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span className="sr-only">アクティブ</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
          アクティブ: 主体的に課題に取り組む能力
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    ),
    key: "initiative_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: (
      <div className="relative group flex items-center justify-center">
        <svg
          className="w-5 h-5 text-orange-400 cursor-help"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <span className="sr-only">クリエイティブ</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
          クリエイティブ: 自ら考えて価値を生み出す能力
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    ),
    key: "creative_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: (
      <div className="relative group flex items-center justify-center">
        <svg
          className="w-5 h-5 text-green-600 cursor-help"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span className="sr-only">コミュニケーション</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
          コミュニケーション: 他者の立場に立って議論を展開する能力
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    ),
    key: "communication_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: (
      <div className="relative group flex items-center justify-center">
        <svg
          className="w-5 h-5 text-pink-600 cursor-help"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span className="sr-only">サポート</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none">
          サポート: 全体を俯瞰してチームを支える能力
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
        </div>
      </div>
    ),
    key: "cooperation_rating",
    renderCell: (value) => (
      <div className="flex justify-center">
        {getRatingBadge(value as string | null)}
      </div>
    ),
  },
  {
    label: "コメント",
    key: "comment",
    renderCell: (value) => (
      <div className="text-xs text-gray-700 max-w-[200px] whitespace-pre-wrap break-words">
        {(value as string | null) || "-"}
      </div>
    ),
  },
  {
    label: "評価者",
    key: "evaluator_name",
    renderCell: (value) => (
      <div className="text-[10px] text-gray-500 max-w-[100px] whitespace-pre-wrap break-words italic">
        {(value as string | null) || "-"}
      </div>
    ),
  },
  {
    label: "メモ",
    key: "memo",
    renderCell: (value) => (
      <div className="text-[10px] text-gray-500 max-w-[150px] whitespace-pre-wrap break-words italic">
        {(value as string | null) || "-"}
      </div>
    ),
  },
  {
    label: "学生からの評価",
    key: "candidate_rating",
    renderCell: (value) => {
      if (!value || value === null) {
        return <span className="text-gray-400">-</span>;
      }
      // 星評価として表示（1-5）
      const rating = typeof value === "number" ? value : Number(value);
      const stars = "★".repeat(rating);
      const emptyStars = "☆".repeat(5 - rating);
      return (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500 text-sm">{stars}</span>
          <span className="text-gray-300 text-sm">{emptyStars}</span>
          <span className="text-xs text-gray-600 ml-1">({rating})</span>
        </div>
      );
    },
  },
  {
    label: "学生からのコメント",
    key: "candidate_comment",
    renderCell: (value, row) => {
      // candidate_liked_pointsが既にパースされている場合はそれを使用
      if (
        row.candidate_liked_points &&
        Array.isArray(row.candidate_liked_points) &&
        row.candidate_liked_points.length > 0
      ) {
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {row.candidate_liked_points.map((point: string, index: number) => (
              <span
                key={index}
                className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-medium"
              >
                {point}
              </span>
            ))}
          </div>
        );
      }
      // フォールバック: candidate_commentを直接パース
      if (value && typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return (
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {parsed.map((point: string, index: number) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-medium"
                  >
                    {point}
                  </span>
                ))}
              </div>
            );
          }
        } catch {
          // JSONでない場合は通常のテキスト表示
        }
      }
      return <span className="text-gray-400">-</span>;
    },
  },
];

type RecruiterRatingPageClientProps = {
  loggedInRecruiterId?: string;
  loggedInCompanyId?: string;
  isAdmin?: boolean;
};

function RecruiterRatingPageClient({
  loggedInRecruiterId,
  loggedInCompanyId,
  isAdmin = false,
}: RecruiterRatingPageClientProps) {
  const ratingModal = useModal();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [loggedInRecruiter, setLoggedInRecruiter] = useState<Recruiter | null>(
    null
  );
  const [events, setEvents] = useState<Event[]>([]);
  const [reservations, setReservations] = useState<CandidateReservation[]>([]);

  // ログイン中の担当者・企業IDがある場合はそれを使用、ない場合は手動選択
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    loggedInCompanyId || ""
  );
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>(
    loggedInRecruiterId || ""
  );
  const SELECTED_EVENT_KEY = "recruiter_selected_event_id";
  const [selectedEventId] = useSessionStorage<string>(SELECTED_EVENT_KEY, "");
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateReservation | null>(null);
  const [selectedSeatLetter, setSelectedSeatLetter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn] = useState(!!(loggedInRecruiterId && loggedInCompanyId));

  const fetchCompanies = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("企業取得エラー:", error);
      return;
    }

    setCompanies(data || []);
  }, []);

  const fetchRecruiters = useCallback(
    async (companyId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, company_id, last_name, first_name, last_name_kana, first_name_kana, email"
        )
        .eq("company_id", companyId)
        .order("last_name_kana");

      if (error) {
        console.error("担当者取得エラー:", error);
        return;
      }

      setRecruiters(data || []);

      // 担当者が取得され、現在未選択の場合は最初の担当者を選択
      if (data && data.length > 0 && !selectedRecruiterId) {
        setSelectedRecruiterId(data[0].id);
      }
    },
    [selectedRecruiterId]
  );

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      console.error("イベント取得エラー:", error);
      return;
    }

    setEvents(data || []);
  }, []);

  const fetchEventsForCompany = useCallback(async (companyId: string) => {
    const supabase = createClient();
    // 自分の企業が参加登録されているイベントのみを取得
    const { data, error } = await supabase
      .from("event_companies")
      .select(
        `
        event_id,
        events (
          *
        )
      `
      )
      .eq("company_id", companyId);

    if (error) {
      console.error("イベント取得エラー:", error);
      return;
    }

    // データを整形（eventsテーブルのデータを抽出）
    type EventItem = {
      event_id: string;
      events: Database["public"]["Tables"]["events"]["Row"] | null;
    };
    const formattedEvents = ((data || []) as unknown as EventItem[])
      .map((item) => item.events)
      .filter(
        (event): event is Database["public"]["Tables"]["events"]["Row"] =>
          event !== null
      )
      .sort((a, b) => {
        // イベント日付で降順にソート
        const dateA = new Date(a.event_date).getTime();
        const dateB = new Date(b.event_date).getTime();
        return dateB - dateA;
      });

    setEvents(formattedEvents);
  }, []);

  useEffect(() => {
    // ログインしていない場合のみ企業一覧を取得
    if (!isLoggedIn) {
      fetchCompanies();
    }
  }, [isLoggedIn, fetchCompanies]);

  useEffect(() => {
    // ログインしていない場合のみ担当者一覧を取得
    if (!isLoggedIn && selectedCompanyId) {
      fetchRecruiters(selectedCompanyId);
    } else if (!isLoggedIn) {
      setRecruiters([]);
      setSelectedRecruiterId("");
    }
  }, [selectedCompanyId, isLoggedIn, fetchRecruiters]);

  // ログイン中の担当者・企業IDが変更された場合に更新
  useEffect(() => {
    if (loggedInCompanyId) {
      setSelectedCompanyId(loggedInCompanyId);
    }
  }, [loggedInCompanyId]);

  const fetchLoggedInRecruiter = useCallback(async (recruiterId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, company_id, last_name, first_name, last_name_kana, first_name_kana, email"
      )
      .eq("id", recruiterId)
      .single();

    if (error) {
      console.error("担当者情報取得エラー:", error);
      return;
    }

    if (data) {
      setLoggedInRecruiter(data);
    }
  }, []);

  useEffect(() => {
    if (loggedInRecruiterId) {
      setSelectedRecruiterId(loggedInRecruiterId);
      // ログイン中の担当者情報を取得
      fetchLoggedInRecruiter(loggedInRecruiterId);
    }
  }, [loggedInRecruiterId, fetchLoggedInRecruiter]);

  const fetchReservations = useCallback(
    async (eventId: string | null) => {
      setIsLoading(true);
      try {
        // eventIdの検証
        if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
          console.error("fetchReservations: 無効なeventId", {
            eventId,
            type: typeof eventId,
          });
          setReservations([]);
          setIsLoading(false);
          return;
        }

        const supabase = createClient();

        // 企業担当者がログインしている場合、自分の企業が参加登録されているイベントか確認
        if (isLoggedIn && loggedInCompanyId) {
          const { data: eventCompany, error: eventCompanyError } =
            await supabase
              .from("event_companies")
              .select("id")
              .eq("event_id", eventId)
              .eq("company_id", loggedInCompanyId)
              .single();

          if (eventCompanyError || !eventCompany) {
            console.error(
              "このイベントには参加登録されていません:",
              eventCompanyError
            );
            setReservations([]);
            setIsLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from("event_reservations")
          .select(
            `
          *,
          candidates (
            last_name,
            first_name,
            last_name_kana,
            first_name_kana,
            school_name
          )
        `
          )
          .eq("event_id", eventId)
          .eq("attended", true); // 出席登録している学生のみ

        if (error) {
          console.error("予約取得エラー:", error);
          setIsLoading(false);
          return;
        }

        // 評価データを取得（イベント-企業単位で取得）
        type RatingData =
          Database["public"]["Tables"]["event_ratings_recruiter_to_candidate"]["Row"];
        let ratingsList: RatingData[] = []; // すべての評価を保持
        const candidateRatingsMap = new Map<
          string,
          { rating: number; comment: string | null }
        >(); // 学生からの評価

        const companyId =
          selectedCompanyId ||
          (isLoggedIn && loggedInCompanyId ? loggedInCompanyId : null);
        if (
          data &&
          data.length > 0 &&
          selectedEventId &&
          companyId &&
          typeof selectedEventId === "string" &&
          selectedEventId.trim() !== ""
        ) {
          type ReservationItem = { candidate_id: string };
          const candidateIds = data.map((r: ReservationItem) => r.candidate_id);

          if (candidateIds.length > 0) {
            // 評価データと学生評価データを並列取得（パフォーマンス改善）
            const [ratingsResponse, candidateRatingsResponse] =
              await Promise.all([
                supabase
                  .from("event_ratings_recruiter_to_candidate")
                  .select("*")
                  .eq("event_id", selectedEventId)
                  .eq("company_id", companyId)
                  .in("candidate_id", candidateIds),
                supabase
                  .from("event_ratings_candidate_to_company")
                  .select("candidate_id, rating, comment")
                  .eq("event_id", selectedEventId)
                  .eq("company_id", companyId)
                  .in("candidate_id", candidateIds),
              ]);

            const { data: ratingsData, error: ratingsError } = ratingsResponse;
            const { data: candidateRatingsData, error: candidateRatingsError } =
              candidateRatingsResponse;

            if (ratingsError) {
              console.error("評価データ取得エラー:", ratingsError);
            } else if (ratingsData) {
              ratingsList = ratingsData as RatingData[];
            }

            if (candidateRatingsError) {
              console.error("学生評価取得エラー:", candidateRatingsError);
            } else if (candidateRatingsData) {
              candidateRatingsData.forEach((r) => {
                candidateRatingsMap.set(r.candidate_id, {
                  rating: r.rating,
                  comment: r.comment || null,
                });
              });
            }
          }
        }

        // データを整形
        // 各学生に対して、その学生のすべての評価を行として展開
        // 担当者でフィルタリングしない（企業のすべての担当者の評価を表示）
        const formattedData: CandidateReservation[] = [];

        type ReservationData =
          Database["public"]["Tables"]["event_reservations"]["Row"] & {
            candidates:
              | Database["public"]["Tables"]["candidates"]["Row"]
              | null;
          };
        (data || []).forEach((reservation: ReservationData) => {
          // この学生に対するすべての評価を取得（担当者でフィルタリングしない）
          const studentRatings = ratingsList.filter(
            (rating: RatingData) =>
              rating.candidate_id === reservation.candidate_id
          );

          // 学生からの評価を取得
          const candidateRating = candidateRatingsMap.get(
            reservation.candidate_id
          );

          if (studentRatings.length > 0) {
            // 評価がある場合は、各評価を行として追加（企業単位の評価なので通常は1つ）
            studentRatings.forEach((rating: RatingData) => {
              formattedData.push({
                id: `${reservation.id}_${rating.id}`, // 一意のIDを生成（予約ID + 評価ID）
                candidate_id: reservation.candidate_id,
                candidate_name: reservation.candidates
                  ? `${reservation.candidates.last_name} ${reservation.candidates.first_name}`
                  : "不明",
                candidate_kana: reservation.candidates
                  ? `${reservation.candidates.last_name_kana} ${reservation.candidates.first_name_kana}`
                  : "不明",
                phone: "", // 表示しない
                email: "", // 表示しない
                school_name: reservation.candidates?.school_name || "",
                seat_number: reservation.seat_number || null,
                attended: true, // 出席登録済みのみ表示
                evaluator_name: rating.evaluator_name || null,
                overall_rating: rating.overall_rating
                  ? RATING_NUMBER_MAP[rating.overall_rating] || null
                  : null,
                logic_rating: rating.logic_rating
                  ? RATING_NUMBER_MAP[rating.logic_rating] || null
                  : null,
                initiative_rating: rating.initiative_rating
                  ? RATING_NUMBER_MAP[rating.initiative_rating] || null
                  : null,
                cooperation_rating: rating.cooperation_rating
                  ? RATING_NUMBER_MAP[rating.cooperation_rating] || null
                  : null,
                creative_rating: rating.creative_rating
                  ? RATING_NUMBER_MAP[rating.creative_rating] || null
                  : null,
                communication_rating: rating.communication_rating
                  ? RATING_NUMBER_MAP[rating.communication_rating] || null
                  : null,
                comment: rating.comment || null,
                memo: rating.memo || null,
                candidate_rating:
                  candidateRating?.rating !== undefined &&
                  candidateRating?.rating !== null
                    ? candidateRating.rating
                    : null,
                candidate_comment: candidateRating?.comment || null,
                candidate_liked_points: (() => {
                  if (!candidateRating?.comment) return null;
                  try {
                    const parsed = JSON.parse(candidateRating.comment);
                    if (Array.isArray(parsed)) {
                      return parsed;
                    }
                  } catch {
                    // JSONでない場合はnull
                  }
                  return null;
                })(),
              });
            });
          } else {
            // 評価がない場合も1行として追加
            formattedData.push({
              id: reservation.id,
              candidate_id: reservation.candidate_id,
              candidate_name: reservation.candidates
                ? `${reservation.candidates.last_name} ${reservation.candidates.first_name}`
                : "不明",
              candidate_kana: reservation.candidates
                ? `${reservation.candidates.last_name_kana} ${reservation.candidates.first_name_kana}`
                : "不明",
              phone: "", // 表示しない
              email: "", // 表示しない
              school_name: reservation.candidates?.school_name || "",
              seat_number: reservation.seat_number || null,
              attended: true, // 出席登録済みのみ表示
              evaluator_name: null,
              overall_rating: null,
              logic_rating: null,
              initiative_rating: null,
              cooperation_rating: null,
              creative_rating: null,
              communication_rating: null,
              comment: null,
              memo: null,
              candidate_rating:
                candidateRating?.rating !== undefined &&
                candidateRating?.rating !== null
                  ? candidateRating.rating
                  : null,
              candidate_comment: candidateRating?.comment || null,
              candidate_liked_points: (() => {
                if (!candidateRating?.comment) return null;
                try {
                  const parsed = JSON.parse(candidateRating.comment);
                  if (Array.isArray(parsed)) {
                    return parsed;
                  }
                } catch {
                  // JSONでない場合はnull
                }
                return null;
              })(),
            });
          }
        });

        // 席番号順に並び替え
        const sortedData = formattedData.sort((a, b) => {
          const seatA = a.seat_number || "";
          const seatB = b.seat_number || "";

          // 席番号を比較（例: "A1" -> ["A", "1"]）
          const matchA = seatA.match(/^([A-Z])(\d+)$/);
          const matchB = seatB.match(/^([A-Z])(\d+)$/);

          if (matchA && matchB) {
            const letterA = matchA[1];
            const letterB = matchB[1];
            const numA = parseInt(matchA[2], 10);
            const numB = parseInt(matchB[2], 10);

            // アルファベットで比較
            if (letterA !== letterB) {
              return letterA.localeCompare(letterB);
            }
            // 数字で比較
            return numA - numB;
          }

          // 席番号の形式が不正な場合は文字列比較
          return seatA.localeCompare(seatB);
        });

        setReservations(sortedData);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoggedIn, loggedInCompanyId, selectedCompanyId, selectedEventId]
  );

  useEffect(() => {
    if (isLoggedIn && loggedInCompanyId) {
      // 企業担当者がログインしている場合、自分の企業が参加登録されているイベントのみを取得
      fetchEventsForCompany(loggedInCompanyId);
    } else {
      // 管理者のテスト用：全てのイベントを取得
      fetchEvents();
    }
  }, [isLoggedIn, loggedInCompanyId, fetchEventsForCompany, fetchEvents]);

  useEffect(() => {
    const companyId =
      selectedCompanyId ||
      (isLoggedIn && loggedInCompanyId ? loggedInCompanyId : null);
    if (selectedEventId && companyId) {
      fetchReservations(selectedEventId);
    } else {
      setReservations([]);
    }
    // イベントが変更されたらフィルタをリセット
    setSelectedSeatLetter("");
  }, [
    selectedEventId,
    selectedCompanyId,
    isLoggedIn,
    loggedInCompanyId,
    fetchReservations,
  ]);

  const handleRatingClick = (reservation: CandidateReservation) => {
    setSelectedCandidate(reservation);
    ratingModal.open();
  };

  const handleCloseModal = () => {
    ratingModal.close();
    setSelectedCandidate(null);
  };

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));

  const recruiterOptions = recruiters.map((r) => ({
    value: r.id,
    label: `${r.last_name} ${r.first_name} (${r.last_name_kana} ${r.first_name_kana})`,
  }));

  // 存在する席番号のアルファベットを抽出
  const availableSeatLetters = Array.from(
    new Set(
      reservations
        .map((r) => r.seat_number)
        .filter((seat): seat is string => seat !== null && seat !== "-")
        .map((seat) => {
          const match = seat.match(/^([A-Z])/);
          return match ? match[1] : null;
        })
        .filter((letter): letter is string => letter !== null)
    )
  ).sort();

  // 表示用データの準備（席番号でフィルタリング）
  const filteredReservations = selectedSeatLetter
    ? reservations.filter((r) => {
        if (!r.seat_number || r.seat_number === "-") return false;
        const match = r.seat_number.match(/^([A-Z])/);
        return match && match[1] === selectedSeatLetter;
      })
    : reservations;

  // 評価完了数を計算（すべての評価項目が入力されているもの）
  // フィルタリング前の全体から計算
  const completedRatingsCount = reservations.filter((r) => {
    return (
      r.overall_rating &&
      r.overall_rating !== "-" &&
      r.logic_rating &&
      r.logic_rating !== "-" &&
      r.initiative_rating &&
      r.initiative_rating !== "-" &&
      r.cooperation_rating &&
      r.cooperation_rating !== "-" &&
      r.creative_rating &&
      r.creative_rating !== "-" &&
      r.communication_rating &&
      r.communication_rating !== "-"
    );
  }).length;

  // 総合評価ごとの件数を計算
  const ratingCounts = {
    S: reservations.filter((r) => r.overall_rating === "S").length,
    A: reservations.filter((r) => r.overall_rating === "A").length,
    B: reservations.filter((r) => r.overall_rating === "B").length,
    C: reservations.filter((r) => r.overall_rating === "C").length,
  };

  const displayData = filteredReservations.map((r) => ({
    ...r,
    seat_number: r.seat_number || "-",
    evaluator_name: r.evaluator_name || "-",
    // 評価は数値のまま保持（getRatingBadgeで処理）
    overall_rating: r.overall_rating,
    logic_rating: r.logic_rating,
    initiative_rating: r.initiative_rating,
    cooperation_rating: r.cooperation_rating,
    creative_rating: r.creative_rating,
    communication_rating: r.communication_rating,
    comment: r.comment || null,
    candidate_rating:
      r.candidate_rating !== undefined && r.candidate_rating !== null
        ? r.candidate_rating
        : null,
    candidate_comment: r.candidate_comment || null,
    candidate_liked_points: r.candidate_liked_points || null,
  }));

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">学生評価</h2>
        {isAdmin && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
            管理者プレビュー
          </span>
        )}
      </div>

      {selectedEventId && events.find((e) => e.id === selectedEventId) && (
        <div className="mb-4 text-sm text-gray-600">
          {formatEventDisplay(events.find((e) => e.id === selectedEventId)!)}
        </div>
      )}

      <div className="mb-4 space-y-3">
        {/* 使い方説明 */}
        <div className="mb-6">
          <RecruiterGuide
            title="学生評価の手順"
            items={[
              "学生を選択して各評価項目を入力してください。高く評価した学生とは座談会実施の優先度が上がります。",
              "総合評価は各評価項目の平均値で自動算出されます。総合評価がSまたはAの場合は学生へのコメントが必須です。",
              "ご担当者様2名以上で同じ学生に評価入力をすると、最新の評価に上書きされてしまいます。事前にどなたがどの学生を評価するかを決めてからの実施を推奨します。",
              "すべての評価が完了すると、運営側でマッチング集計が可能になります。",
            ]}
          />
        </div>

        {isAdmin && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
            <div className="text-xs font-bold text-red-600 mb-2">
              管理者プレビューモード
            </div>
            <FormField label="企業" className="text-sm font-medium">
              <SelectInput
                name="company_id"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedRecruiterId("");
                }}
                options={companyOptions}
                placeholder="企業を選択"
                className="px-3 py-2 border rounded w-full text-sm min-h-[40px] touch-manipulation"
              />
            </FormField>

            <FormField label="企業担当者" className="text-sm font-medium">
              <SelectInput
                name="recruiter_id"
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                options={recruiterOptions}
                placeholder="担当者を選択"
                disabled={!selectedCompanyId}
                className="px-3 py-2 border rounded w-full text-sm min-h-[40px] touch-manipulation"
              />
            </FormField>
          </div>
        )}

        {!isAdmin && !isLoggedIn && (
          <>
            <FormField label="企業" className="mb-3 text-sm font-medium">
              <SelectInput
                name="company_id"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  setSelectedRecruiterId("");
                }}
                options={companyOptions}
                placeholder="企業を選択"
                className="px-3 py-2 border rounded w-full text-sm min-h-[40px] touch-manipulation"
              />
            </FormField>

            <FormField label="企業担当者" className="mb-3 text-sm font-medium">
              <SelectInput
                name="recruiter_id"
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                options={recruiterOptions}
                placeholder="担当者を選択"
                disabled={!selectedCompanyId}
                className="px-3 py-2 border rounded w-full text-sm min-h-[40px] touch-manipulation"
              />
            </FormField>
          </>
        )}

        {!selectedEventId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
            <p className="font-medium mb-1">イベントが選択されていません</p>
            <p className="text-sm">
              サイドバーから「イベント選択」を選択して、イベントを選択してください。
            </p>
          </div>
        )}

        {isLoggedIn && events.length === 0 && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
            <p className="text-sm">参加登録されているイベントがありません</p>
          </div>
        )}
      </div>

      {selectedEventId &&
      (selectedCompanyId || (isLoggedIn && loggedInCompanyId)) &&
      (selectedRecruiterId || (isLoggedIn && loggedInRecruiterId)) ? (
        <div className="mt-6">
          {/* 総合評価ごとの件数表示 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">
                総合評価ごとの件数
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">評価完了: </span>
                <span className="text-blue-600 font-semibold">
                  {completedRatingsCount}
                </span>
                <span className="text-gray-500"> / {reservations.length}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm bg-red-500 text-white">
                  S
                </span>
                <span className="text-sm text-gray-700">
                  {ratingCounts.S}
                  <span className="text-gray-500 text-xs ml-1"></span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm bg-blue-600 text-white">
                  A
                </span>
                <span className="text-sm text-gray-700">{ratingCounts.A}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm bg-blue-400 text-white">
                  B
                </span>
                <span className="text-sm text-gray-700">{ratingCounts.B}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded font-bold text-sm bg-gray-400 text-white">
                  C
                </span>
                <span className="text-sm text-gray-700">{ratingCounts.C}</span>
              </div>
            </div>
          </div>

          {/* 席番号フィルタリング */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            {availableSeatLetters.length > 0 && (
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  席番号でフィルタ
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSeatLetter("")}
                    className={`px-4 py-2 rounded text-sm font-medium touch-manipulation min-h-[40px] transition-colors ${
                      selectedSeatLetter === ""
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    すべて
                  </button>
                  {availableSeatLetters.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setSelectedSeatLetter(letter)}
                      className={`px-4 py-2 rounded text-sm font-medium touch-manipulation min-h-[40px] transition-colors ${
                        selectedSeatLetter === letter
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div
              className={`flex justify-end ${
                availableSeatLetters.length === 0 ? "w-full" : ""
              }`}
            >
              <RefreshButton
                onClick={async () => {
                  if (selectedEventId) {
                    await fetchReservations(selectedEventId);
                  }
                }}
                isLoading={isLoading}
                disabled={!selectedEventId}
              />
            </div>
          </div>

          <Table
            variant="ipad"
            headers={headers}
            data={displayData}
            isLoading={isLoading}
            onRowClick={(row) => {
              // 評価ボタンが有効な場合のみモーダルを開く
              const canRate =
                (selectedRecruiterId || (isLoggedIn && loggedInRecruiterId)) &&
                (selectedCompanyId || (isLoggedIn && loggedInCompanyId));

              if (canRate) {
                handleRatingClick(row as CandidateReservation);
              }
            }}
          />
        </div>
      ) : !selectedEventId ? (
        <div className="text-center py-8 text-gray-500">
          イベントを選択すると、出席登録している学生一覧が表示されます
        </div>
      ) : (!selectedCompanyId && !(isLoggedIn && loggedInCompanyId)) ||
        (!selectedRecruiterId && !(isLoggedIn && loggedInRecruiterId)) ? (
        <div className="text-center py-8 text-gray-500">
          企業と担当者を選択すると、評価一覧が表示されます
        </div>
      ) : null}

      {selectedCandidate && (
        <RecruiterRatingModal
          isOpen={ratingModal.isOpen}
          onClose={handleCloseModal}
          onSuccess={async () => {
            // 保存後にデータを再取得
            if (selectedEventId) {
              await fetchReservations(selectedEventId);
            }
          }}
          companyId={
            selectedCompanyId ||
            (isLoggedIn && loggedInCompanyId ? loggedInCompanyId : "")
          }
          recruiterId={
            selectedRecruiterId ||
            (isLoggedIn && loggedInRecruiterId ? loggedInRecruiterId : "")
          }
          recruiterName={(() => {
            const rId = selectedRecruiterId || loggedInRecruiterId;
            const recruiter =
              recruiters.find((r) => r.id === rId) ||
              (loggedInRecruiter?.id === rId ? loggedInRecruiter : null);
            return recruiter
              ? `${recruiter.last_name} ${recruiter.first_name}`
              : "";
          })()}
          candidateId={selectedCandidate.candidate_id}
          eventId={selectedEventId || ""}
          candidateName={selectedCandidate.candidate_name}
          candidateKana={selectedCandidate.candidate_kana}
          seatNumber={selectedCandidate.seat_number}
          schoolName={selectedCandidate.school_name}
          candidateRating={selectedCandidate.candidate_rating}
          candidateLikedPoints={selectedCandidate.candidate_liked_points}
          eventName={
            events.find((e) => e.id === selectedEventId)
              ? formatEventDisplay(
                  events.find((e) => e.id === selectedEventId)!
                )
              : ""
          }
        />
      )}
    </div>
  );
}

export default RecruiterRatingPageClient;
