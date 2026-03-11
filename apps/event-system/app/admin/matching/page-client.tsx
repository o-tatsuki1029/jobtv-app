"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import RefreshButton from "@/components/ui/RefreshButton";
import { formatEventDisplay } from "@/utils/data/event";
import { Event } from "@/types/event.types";
import {
  executeMatching,
  getMatchingSession,
  getSpecialInterviews,
  getEventSpecialInterviews,
} from "@/lib/actions/matching-actions";
import {
  MatchingWeights,
  SpecialInterviewInput,
  EvaluationStatus,
} from "@/types/matching.types";
import SpecialInterviewModal from "../../../components/ui/modals/SpecialInterviewModal";
import RecruiterRatingModal from "@/components/ui/modals/RecruiterRatingModal";
import CandidateRatingModal from "@/components/ui/modals/CandidateRatingModal";
import { EventSelector } from "./components/EventSelector";
import { MatchingConfig } from "./components/MatchingConfig";
import { EvaluationSection } from "./components/EvaluationSection";

export default function MatchingPageClient() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<number>(4);
  const [companyCount, setCompanyCount] = useState<number>(0);
  // 重みづけは企業重視で固定
  const companyWeight = 0.7;
  const candidateWeight = 0.3;
  const [evaluationStatus, setEvaluationStatus] =
    useState<EvaluationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialInterviewModal, setSpecialInterviewModal] = useState(false);
  const [specialInterviews, setSpecialInterviews] = useState<
    SpecialInterviewInput[]
  >([]);
  const [matchingSessionId, setMatchingSessionId] = useState<string | null>(
    null
  );
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    candidateName: string;
    candidateKana?: string;
    seatNumber?: string;
    schoolName?: string;
    companyId: string | null;
    companyName: string;
    existingRating: number | null;
    existingComment: string | null;
    isCompanyRating?: boolean; // 企業側の評価かどうか
    candidateRating?: number | null; // 学生からの評価
    candidateLikedPoints?: string[] | null; // 学生が選択した「気に入ったところ」
  }>({
    isOpen: false,
    candidateId: null,
    candidateName: "",
    companyId: null,
    companyName: "",
    existingRating: null,
    existingComment: null,
    isCompanyRating: false,
    candidateRating: null,
    candidateLikedPoints: null,
  });
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          event_types (
            name,
            target_graduation_year,
            area
          )
        `
        )
        .order("event_date", { ascending: true });

      if (error) {
        console.error("イベント取得エラー:", error);
        return;
      }

      // イベントタイプマスタの情報をマージ
      type EventWithMaster = Event & {
        event_types: {
          name: string;
          target_graduation_year: number | null;
          area: string | null;
        } | null;
      };
      let eventsWithNames = (data || []).map((event: EventWithMaster) => {
        const eventType = event.event_types;
        return {
          ...event,
          event_name: eventType?.name || "",
          target_graduation_year: eventType?.target_graduation_year || null,
          area: eventType?.area || null,
        };
      });

      // 本日のみ表示のフィルタリング
      if (showTodayOnly) {
        const today = new Date().toISOString().split("T")[0];
        eventsWithNames = eventsWithNames.filter(
          (event) => event.event_date === today
        );
      }

      // 今日の日付を取得（時刻を00:00:00に設定）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 未来のイベント（今日を含む）と過去のイベントに分ける
      const futureEvents: Event[] = [];
      const pastEvents: Event[] = [];

      eventsWithNames.forEach(
        (event: Event & { event_name?: string; area?: string | null }) => {
          const eventDate = new Date(event.event_date);
          eventDate.setHours(0, 0, 0, 0);

          if (eventDate >= today) {
            futureEvents.push(event);
          } else {
            pastEvents.push(event);
          }
        }
      );

      // 未来のイベントは日付の昇順（近い順）、過去のイベントも日付の昇順（古い順）
      futureEvents.sort((a, b) => {
        const dateA = new Date(a.event_date).getTime();
        const dateB = new Date(b.event_date).getTime();
        return dateA - dateB;
      });

      pastEvents.sort((a, b) => {
        const dateA = new Date(a.event_date).getTime();
        const dateB = new Date(b.event_date).getTime();
        return dateA - dateB;
      });

      // 未来のイベントを先に、過去のイベントを後に配置
      setEvents([...futureEvents, ...pastEvents]);
    } catch (error) {
      console.error("予期しないエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [showTodayOnly]);

  const fetchEvaluationStatus = useCallback(async (eventId: string) => {
    if (!eventId) {
      setEvaluationStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 参加企業を取得
      const { data: rawEventCompanies, error: companiesError } = await supabase
        .from("event_companies")
        .select("company_id, companies(id, name)")
        .eq("event_id", eventId);

      const eventCompanies = rawEventCompanies as unknown as Array<{
        company_id: string;
        companies?: { name: string } | null;
      }> | null;

      if (companiesError) {
        console.error("企業取得エラー:", companiesError);
        setError(`企業取得エラー: ${companiesError.message}`);
        setEvaluationStatus(null);
        return;
      }

      if (!eventCompanies || eventCompanies.length === 0) {
        setError("このイベントに参加登録している企業がありません");
        setEvaluationStatus(null);
        setCompanyCount(0);
        return;
      }

      const companyIds = eventCompanies.map(
        (ec: { company_id: string }) => ec.company_id
      );
      const newCompanyCount = companyIds.length;
      setCompanyCount(newCompanyCount);

      // 座談会回数を企業数以下に調整（企業数が0より大きい場合のみ）
      // 関数型更新を使用して、現在のsessionCountを参照（無限ループを防ぐ）
      if (newCompanyCount > 0) {
        setSessionCount((prev) => {
          // 既存のセッションがない場合、または企業数を超えている場合のみ調整
          if (prev === 0 || prev > newCompanyCount) {
            // デフォルトは4回、企業数が4未満の場合は企業数に設定
            return Math.min(4, newCompanyCount);
          }
          return prev;
        });
      }

      // 出席登録している学生を取得
      const { data: reservations, error: reservationsError } = await supabase
        .from("event_reservations")
        .select(
          `
          candidate_id,
          seat_number,
          candidates (
            id,
            school_name,
            profiles!profiles_candidate_id_fkey(last_name, first_name, last_name_kana, first_name_kana)
          )
        `
        )
        .eq("event_id", eventId)
        .eq("attended", true);

      if (reservationsError) {
        console.error("学生取得エラー:", reservationsError);
        setError(`学生取得エラー: ${reservationsError.message}`);
        setEvaluationStatus(null);
        return;
      }

      if (!reservations || reservations.length === 0) {
        setError("このイベントに出席登録している学生がありません");
        setEvaluationStatus(null);
        return;
      }

      const candidateIds = Array.from(
        new Set(
          reservations.map((r: { candidate_id: string }) => r.candidate_id)
        )
      );

      // 企業評価完了数を取得
      type CompanyRating = { company_id: string; candidate_id: string };
      let companyRatings: CompanyRating[] = [];
      if (companyIds.length > 0 && candidateIds.length > 0) {
        const { data, error: companyRatingsError } = await supabase
          .from("event_ratings_recruiter_to_candidate")
          .select("company_id, candidate_id")
          .eq("event_id", eventId)
          .in("company_id", companyIds)
          .in("candidate_id", candidateIds)
          .not("overall_rating", "is", null);

        if (companyRatingsError) {
          console.error("企業評価取得エラー:", companyRatingsError);
          setError(`企業評価取得エラー: ${companyRatingsError.message}`);
          setEvaluationStatus(null);
          return;
        }

        companyRatings = data || [];
      }

      // 学生評価完了数を取得
      type CandidateRating = { company_id: string; candidate_id: string };
      let candidateRatings: CandidateRating[] = [];
      if (companyIds.length > 0 && candidateIds.length > 0) {
        const { data, error: candidateRatingsError } = await supabase
          .from("event_ratings_candidate_to_company")
          .select("company_id, candidate_id")
          .eq("event_id", eventId)
          .in("company_id", companyIds)
          .in("candidate_id", candidateIds);

        if (candidateRatingsError) {
          console.error("学生評価取得エラー:", candidateRatingsError);
          setError(`学生評価取得エラー: ${candidateRatingsError.message}`);
          setEvaluationStatus(null);
          return;
        }

        candidateRatings = data || [];
      }

      // 企業ごとの評価完了状況を集計
      const companyRatingMap = new Map<string, Set<string>>();
      companyRatings.forEach((r: CompanyRating) => {
        if (!companyRatingMap.has(r.company_id)) {
          companyRatingMap.set(r.company_id, new Set());
        }
        companyRatingMap.get(r.company_id)!.add(r.candidate_id);
      });

      // 学生ごとの評価完了状況を集計
      const candidateRatingMap = new Map<string, Set<string>>();
      candidateRatings.forEach((r: CandidateRating) => {
        if (!candidateRatingMap.has(r.candidate_id)) {
          candidateRatingMap.set(r.candidate_id, new Set());
        }
        candidateRatingMap.get(r.candidate_id)!.add(r.company_id);
      });

      // ヘルパー関数: 席番号の数値順ソート
      const compareSeats = (a: string | null, b: string | null) => {
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      };

      // 企業の評価完了状況
      const companies: EvaluationStatus["companies"] = [];
      eventCompanies.forEach((ec) => {
        const companyId = ec.company_id;
        const ratedCandidateIds = companyRatingMap.get(companyId) || new Set();

        const allCandidates = (
          reservations as unknown as Array<{
            candidate_id: string;
            seat_number: string | null;
            candidates: {
              school_name: string | null;
              profiles: {
                last_name: string;
                first_name: string;
                last_name_kana: string;
                first_name_kana: string;
              } | null;
            } | null;
          }>
        ).map((r) => ({
          id: r.candidate_id,
          name: r.candidates?.profiles
            ? `${r.candidates.profiles.last_name} ${r.candidates.profiles.first_name}`
            : "",
          kana: r.candidates?.profiles
            ? `${r.candidates.profiles.last_name_kana} ${r.candidates.profiles.first_name_kana}`
            : undefined,
          seat_number: r.seat_number || null,
          school_name: r.candidates?.school_name || null,
        }));

        companies.push({
          id: companyId,
          name: ec.companies?.name || "",
          unratedCandidates: allCandidates
            .filter((c) => !ratedCandidateIds.has(c.id))
            .sort((a, b) => compareSeats(a.seat_number, b.seat_number)),
          ratedCandidates: allCandidates
            .filter((c) => ratedCandidateIds.has(c.id))
            .sort((a, b) => compareSeats(a.seat_number, b.seat_number)),
        });
      });

      // 企業リストのソート: 未完了があるものを上に、全て完了したものを下に
      companies.sort((a, b) => {
        const aDone = a.unratedCandidates.length === 0;
        const bDone = b.unratedCandidates.length === 0;
        if (aDone !== bDone) return aDone ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      // 学生の評価完了状況
      const candidates: EvaluationStatus["candidates"] = [];
      (
        reservations as unknown as Array<{
          candidate_id: string;
          seat_number: string | null;
          candidates: {
            profiles: {
              last_name: string;
              first_name: string;
            } | null;
          } | null;
        }>
      ).forEach((r) => {
        const candidateId = r.candidate_id;
        const ratedCompanyIds =
          candidateRatingMap.get(candidateId) || new Set();

        const allCompanies = eventCompanies.map((ec) => ({
          id: ec.company_id,
          name: ec.companies?.name || "",
        }));

        candidates.push({
          id: candidateId,
          name: r.candidates?.profiles
            ? `${r.candidates.profiles.last_name} ${r.candidates.profiles.first_name}`
            : "",
          seat_number: r.seat_number || null,
          unratedCompanies: allCompanies
            .filter((c) => !ratedCompanyIds.has(c.id))
            .sort((a, b) => a.name.localeCompare(b.name)),
          ratedCompanies: allCompanies
            .filter((c) => ratedCompanyIds.has(c.id))
            .sort((a, b) => a.name.localeCompare(b.name)),
        });
      });

      // 学生リストのソート: 完了を下に、それ以外を席順で上に
      candidates.sort((a, b) => {
        const aDone = a.unratedCompanies.length === 0;
        const bDone = b.unratedCompanies.length === 0;
        if (aDone !== bDone) return aDone ? 1 : -1;
        return compareSeats(a.seat_number, b.seat_number);
      });

      setEvaluationStatus({
        companyCompleted: companies.filter(
          (c) => c.unratedCandidates.length === 0
        ).length,
        companyTotal: companyIds.length,
        candidateCompleted: candidates.filter(
          (c) => c.unratedCompanies.length === 0
        ).length,
        candidateTotal: candidateIds.length,
        candidates,
        companies,
      });
      setError(null);
    } catch (error: unknown) {
      console.error("予期しないエラー:", error);
      setError(
        `予期しないエラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
      setEvaluationStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchEvaluationStatus(selectedEventId);

      // 既存のマッチングセッション情報の取得
      getMatchingSession(selectedEventId).then((sessionResult) => {
        if (sessionResult.success && sessionResult.session) {
          setMatchingSessionId(sessionResult.session.id);
          setSessionCount(sessionResult.session.session_count);
        } else {
          setMatchingSessionId(null);
        }

        // 特別面談設定の取得
        getEventSpecialInterviews(selectedEventId).then((result) => {
          if (
            result.success &&
            result.specialInterviews &&
            result.specialInterviews.length > 0
          ) {
            const formattedInterviews: SpecialInterviewInput[] =
              result.specialInterviews.map((si: any) => ({
                companyId: si.company_id,
                candidateId: si.candidate_id,
                sessionNumber: si.session_number,
              }));
            setSpecialInterviews(formattedInterviews);
          } else if (sessionResult.success && sessionResult.session) {
            // イベントごとの設定がない場合は、既存セッションから取得を試みる
            getSpecialInterviews(sessionResult.session.id).then((siResult) => {
              if (siResult.success && siResult.specialInterviews) {
                const formattedInterviews: SpecialInterviewInput[] =
                  siResult.specialInterviews.map(
                    (si: {
                      company_id: string;
                      candidate_id: string;
                      session_number: number;
                    }) => ({
                      companyId: si.company_id,
                      candidateId: si.candidate_id,
                      sessionNumber: si.session_number,
                    })
                  );
                setSpecialInterviews(formattedInterviews);
              } else {
                setSpecialInterviews([]);
              }
            });
          } else {
            setSpecialInterviews([]);
          }
        });
      });
    } else {
      setEvaluationStatus(null);
      setMatchingSessionId(null);
      setSpecialInterviews([]);
      setCompanyCount(0);
    }
  }, [selectedEventId, fetchEvaluationStatus]);

  const handleExecuteMatching = async () => {
    if (!selectedEventId) {
      setError("イベントを選択してください");
      return;
    }

    if (!evaluationStatus) {
      setError("評価状況を取得できませんでした");
      return;
    }

    if (
      evaluationStatus.companyCompleted < evaluationStatus.companyTotal ||
      evaluationStatus.candidateCompleted < evaluationStatus.candidateTotal
    ) {
      setError("すべての評価が完了していません");
      return;
    }

    setIsExecuting(true);
    setError(null);

    const weights: MatchingWeights = {
      companyWeight,
      candidateWeight,
    };

    const result = await executeMatching(
      selectedEventId,
      sessionCount,
      weights,
      specialInterviews
    );

    if (result.success && result.sessionId) {
      setMatchingSessionId(result.sessionId);
      router.push(`/admin/matching/results/${result.sessionId}`);
    } else {
      setError(result.error || "マッチングの実行に失敗しました");
      setIsExecuting(false);
    }
  };

  const handleFillRandomRatings = async () => {
    if (!selectedEventId || !evaluationStatus) return;

    if (
      !confirm(
        "未完了の評価をすべてランダム（1〜5点、コメント'test'）で埋めますか？"
      )
    )
      return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const candidateToCompanyInserts = [];
      const recruiterToCandidateInserts = [];

      // 学生から企業への未評価分
      for (const candidate of evaluationStatus.candidates) {
        for (const company of candidate.unratedCompanies) {
          const randomRating = Math.floor(Math.random() * 5) + 1;
          const testComment = JSON.stringify(["成長できそう"]); // 適当なタグ
          candidateToCompanyInserts.push({
            candidate_id: candidate.id,
            company_id: company.id,
            event_id: selectedEventId,
            rating: randomRating,
            comment: testComment,
          });
        }
      }

      // 企業から学生への未評価分
      for (const company of evaluationStatus.companies) {
        for (const candidate of company.unratedCandidates) {
          const r4 = () => Math.floor(Math.random() * 4) + 1; // 1〜4 (C〜S)
          const logic = r4();
          const initiative = r4();
          const cooperation = r4();
          const creative = r4();
          const communication = r4();

          // 平均値を四捨五入して総合評価とする
          const overall = Math.round(
            (logic + initiative + cooperation + creative + communication) / 5
          );

          recruiterToCandidateInserts.push({
            company_id: company.id,
            candidate_id: candidate.id,
            event_id: selectedEventId,
            overall_rating: overall,
            logic_rating: logic,
            initiative_rating: initiative,
            cooperation_rating: cooperation,
            creative_rating: creative,
            communication_rating: communication,
            comment: "test(自動入力)",
            memo: "test (自動入力)",
            evaluator_name: "テスト自動入力",
          });
        }
      }

      const promises = [];
      if (candidateToCompanyInserts.length > 0) {
        promises.push(
          supabase
            .from("event_ratings_candidate_to_company")
            .insert(candidateToCompanyInserts)
        );
      }
      if (recruiterToCandidateInserts.length > 0) {
        promises.push(
          supabase
            .from("event_ratings_recruiter_to_candidate")
            .insert(recruiterToCandidateInserts)
        );
      }

      await Promise.all(promises);
      alert(
        `ランダム評価の登録が完了しました。\n\n追加件数:\n・学生→企業: ${candidateToCompanyInserts.length}件\n・企業→学生: ${recruiterToCandidateInserts.length}件`
      );
      await fetchEvaluationStatus(selectedEventId);
    } catch (error) {
      console.error("ランダム評価登録エラー:", error);
      alert("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllRatings = async () => {
    if (!selectedEventId) return;

    if (
      !confirm(
        "現在のイベントのすべての評価データを削除しますか？\nこの操作は取り消せません。"
      )
    )
      return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: error1 } = await supabase
        .from("event_ratings_candidate_to_company")
        .delete()
        .eq("event_id", selectedEventId);

      const { error: error2 } = await supabase
        .from("event_ratings_recruiter_to_candidate")
        .delete()
        .eq("event_id", selectedEventId);

      if (error1 || error2) {
        throw new Error(
          error1?.message || error2?.message || "削除に失敗しました"
        );
      }

      alert("すべての評価データを削除しました。");
      await fetchEvaluationStatus(selectedEventId);
    } catch (error) {
      console.error("評価削除エラー:", error);
      alert(
        "エラーが発生しました: " +
          (error instanceof Error ? error.message : "不明なエラー")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: formatEventDisplay(e),
  }));

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">マッチングシステム</h2>

      <div className="mb-6 space-y-4">
        <EventSelector
          selectedEventId={selectedEventId}
          onEventChange={(eventId) => {
            setSelectedEventId(eventId);
            setSpecialInterviews([]);
          }}
          showTodayOnly={showTodayOnly}
          onShowTodayOnlyChange={(checked) => {
            setShowTodayOnly(checked);
            if (checked) {
              setSelectedEventId("");
              setSpecialInterviews([]);
            }
          }}
          eventOptions={eventOptions}
        />

        {selectedEventId && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <MatchingConfig
              sessionCount={sessionCount}
              setSessionCount={setSessionCount}
              companyCount={companyCount}
              isExecuting={isExecuting}
              onExecute={handleExecuteMatching}
              onSpecialInterviewOpen={() => setSpecialInterviewModal(true)}
              selectedEventId={selectedEventId}
              matchingSessionId={matchingSessionId}
              onShowResults={() =>
                router.push(`/admin/matching/results/${matchingSessionId}`)
              }
              onShowFeedback={() =>
                router.push(`/admin/matching/feedback/${selectedEventId}`)
              }
            />
            <div className="pt-7">
              <RefreshButton
                onClick={async () => {
                  if (selectedEventId) {
                    await fetchEvaluationStatus(selectedEventId);
                  }
                }}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {selectedEventId && evaluationStatus && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvaluationSection
            title="学生評価状況"
            completedCount={evaluationStatus.candidateCompleted}
            totalCount={evaluationStatus.candidateTotal}
          >
            <div className="space-y-4">
              {evaluationStatus.candidates.map((c) => {
                const total = evaluationStatus.companyTotal;
                const completedCount = c.ratedCompanies.length;
                const isFullyCompleted = completedCount === total;
                const isStarted = completedCount > 0;

                return (
                  <details
                    key={c.id}
                    className={`group p-3 border rounded-lg ${
                      isFullyCompleted
                        ? "border-green-100 bg-green-50/30"
                        : isStarted
                        ? "border-blue-100 bg-blue-50/30"
                        : "border-gray-100 bg-gray-50/30"
                    }`}
                  >
                    <summary className="font-bold text-gray-800 flex items-center gap-2 cursor-pointer list-none">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold min-w-[50px] text-center ${
                          isFullyCompleted
                            ? "bg-green-100 text-green-700"
                            : isStarted
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isFullyCompleted
                          ? "完了"
                          : isStarted
                          ? "進行中"
                          : "未着手"}
                      </span>
                      <div className="flex-1">
                        {c.seat_number ? `${c.seat_number} ` : ""}
                        {c.name}
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          ({completedCount}/{total} 完了)
                        </span>
                      </div>
                      <span className="transition-transform group-open:rotate-180 text-gray-400 text-[10px]">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-3 space-y-1.5 pl-2 border-l-2 border-gray-100 ml-6">
                      {/* 未完了リスト */}
                      {c.unratedCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center justify-between bg-white/80 p-2 rounded-md border border-red-50 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span className="text-xs text-gray-700">
                              {company.name}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const supabase = createClient();
                              const { data: ratingData } = await supabase
                                .from("event_ratings_candidate_to_company")
                                .select("rating, comment")
                                .eq("candidate_id", c.id)
                                .eq("company_id", company.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              const likedPoints = (() => {
                                if (!ratingData?.comment) return null;
                                try {
                                  const parsed = JSON.parse(ratingData.comment);
                                  if (Array.isArray(parsed)) return parsed;
                                } catch {}
                                return null;
                              })();

                              setRatingModal({
                                isOpen: true,
                                candidateId: c.id,
                                candidateName: c.name,
                                companyId: company.id,
                                companyName: company.name,
                                existingRating: ratingData?.rating || null,
                                existingComment: ratingData?.comment || null,
                                candidateRating: ratingData?.rating || null,
                                candidateLikedPoints: likedPoints,
                              });
                            }}
                            className="h-7 text-[10px]"
                          >
                            代理評価
                          </Button>
                        </div>
                      ))}
                      {/* 完了リスト */}
                      {c.ratedCompanies.map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center justify-between bg-white/40 p-2 rounded-md border border-gray-100"
                        >
                          <div className="flex items-center gap-2 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="text-xs text-gray-700">
                              {company.name}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const supabase = createClient();
                              const { data: ratingData } = await supabase
                                .from("event_ratings_candidate_to_company")
                                .select("rating, comment")
                                .eq("candidate_id", c.id)
                                .eq("company_id", company.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              const likedPoints = (() => {
                                if (!ratingData?.comment) return null;
                                try {
                                  const parsed = JSON.parse(ratingData.comment);
                                  if (Array.isArray(parsed)) return parsed;
                                } catch {}
                                return null;
                              })();

                              setRatingModal({
                                isOpen: true,
                                candidateId: c.id,
                                candidateName: c.name,
                                companyId: company.id,
                                companyName: company.name,
                                existingRating: ratingData?.rating || null,
                                existingComment: ratingData?.comment || null,
                                candidateRating: ratingData?.rating || null,
                                candidateLikedPoints: likedPoints,
                              });
                            }}
                            className="h-7 text-[10px]"
                          >
                            更新
                          </Button>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </EvaluationSection>

          <EvaluationSection
            title="企業評価状況"
            completedCount={evaluationStatus.companyCompleted}
            totalCount={evaluationStatus.companyTotal}
          >
            <div className="space-y-4">
              {evaluationStatus.companies.map((c) => {
                const total = evaluationStatus.candidateTotal;
                const completedCount = c.ratedCandidates.length;
                const isFullyCompleted = completedCount === total;
                const isStarted = completedCount > 0;

                return (
                  <details
                    key={c.id}
                    className={`group p-3 border rounded-lg ${
                      isFullyCompleted
                        ? "border-green-100 bg-green-50/30"
                        : isStarted
                        ? "border-blue-100 bg-blue-50/30"
                        : "border-gray-100 bg-gray-50/30"
                    }`}
                  >
                    <summary className="font-bold text-gray-800 flex items-center gap-2 cursor-pointer list-none">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold min-w-[50px] text-center ${
                          isFullyCompleted
                            ? "bg-green-100 text-green-700"
                            : isStarted
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isFullyCompleted
                          ? "完了"
                          : isStarted
                          ? "進行中"
                          : "未着手"}
                      </span>
                      <div className="flex-1">
                        {c.name}
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          ({completedCount}/{total} 完了)
                        </span>
                      </div>
                      <span className="transition-transform group-open:rotate-180 text-gray-400 text-[10px]">
                        ▼
                      </span>
                    </summary>
                    <div className="mt-3 space-y-1.5 pl-2 border-l-2 border-gray-100 ml-6">
                      {/* 未完了リスト */}
                      {c.unratedCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between bg-white/80 p-2 rounded-md border border-red-50 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span className="text-xs text-gray-700">
                              {candidate.seat_number
                                ? `${candidate.seat_number} `
                                : ""}
                              {candidate.name}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const supabase = createClient();
                              const { data: existingRating } = await supabase
                                .from("event_ratings_recruiter_to_candidate")
                                .select("overall_rating, comment")
                                .eq("company_id", c.id)
                                .eq("candidate_id", candidate.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              const { data: candidateRating } = await supabase
                                .from("event_ratings_candidate_to_company")
                                .select("rating, comment")
                                .eq("candidate_id", candidate.id)
                                .eq("company_id", c.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              setRatingModal({
                                isOpen: true,
                                candidateId: candidate.id,
                                candidateName: candidate.name,
                                candidateKana: candidate.kana || undefined,
                                seatNumber: candidate.seat_number || undefined,
                                schoolName: candidate.school_name || undefined,
                                companyId: c.id,
                                companyName: c.name,
                                existingRating:
                                  existingRating?.overall_rating || null,
                                existingComment:
                                  existingRating?.comment || null,
                                isCompanyRating: true,
                                candidateRating:
                                  candidateRating?.rating || null,
                                candidateLikedPoints: (() => {
                                  if (!candidateRating?.comment) return null;
                                  try {
                                    const parsed = JSON.parse(
                                      candidateRating.comment
                                    );
                                    if (Array.isArray(parsed)) return parsed;
                                  } catch {}
                                  return null;
                                })(),
                              });
                            }}
                            className="h-7 text-[10px]"
                          >
                            代理評価
                          </Button>
                        </div>
                      ))}
                      {/* 完了リスト */}
                      {c.ratedCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between bg-white/40 p-2 rounded-md border border-gray-100"
                        >
                          <div className="flex items-center gap-2 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="text-xs text-gray-700">
                              {candidate.seat_number
                                ? `${candidate.seat_number} `
                                : ""}
                              {candidate.name}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              const supabase = createClient();
                              const { data: existingRating } = await supabase
                                .from("event_ratings_recruiter_to_candidate")
                                .select("overall_rating, comment")
                                .eq("company_id", c.id)
                                .eq("candidate_id", candidate.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              const { data: candidateRating } = await supabase
                                .from("event_ratings_candidate_to_company")
                                .select("rating, comment")
                                .eq("candidate_id", candidate.id)
                                .eq("company_id", c.id)
                                .eq("event_id", selectedEventId)
                                .single();

                              setRatingModal({
                                isOpen: true,
                                candidateId: candidate.id,
                                candidateName: candidate.name,
                                candidateKana: candidate.kana || undefined,
                                seatNumber: candidate.seat_number || undefined,
                                schoolName: candidate.school_name || undefined,
                                companyId: c.id,
                                companyName: c.name,
                                existingRating:
                                  existingRating?.overall_rating || null,
                                existingComment:
                                  existingRating?.comment || null,
                                isCompanyRating: true,
                                candidateRating:
                                  candidateRating?.rating || null,
                                candidateLikedPoints: (() => {
                                  if (!candidateRating?.comment) return null;
                                  try {
                                    const parsed = JSON.parse(
                                      candidateRating.comment
                                    );
                                    if (Array.isArray(parsed)) return parsed;
                                  } catch {}
                                  return null;
                                })(),
                              });
                            }}
                            className="h-7 text-[10px]"
                          >
                            更新
                          </Button>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </EvaluationSection>
        </div>
      )}

      <div className="flex justify-end items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        {selectedEventId && evaluationStatus && (
          <>
            <Button
              variant="light"
              size="sm"
              onClick={handleDeleteAllRatings}
              disabled={isLoading}
              className="text-red-400 border border-red-200 hover:bg-red-50 hover:text-red-600 font-normal"
            >
              {isLoading ? "処理中..." : "[テスト用] 評価をすべて削除"}
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={handleFillRandomRatings}
              disabled={isLoading}
              className="text-gray-400 border border-gray-200 hover:bg-gray-50 hover:text-gray-600 font-normal"
            >
              {isLoading
                ? "登録中..."
                : "[テスト用] 未完了評価をランダムに埋める"}
            </Button>
          </>
        )}
      </div>

      {specialInterviewModal && selectedEventId && (
        <SpecialInterviewModal
          isOpen={specialInterviewModal}
          onClose={() => setSpecialInterviewModal(false)}
          eventId={selectedEventId}
          sessionCount={sessionCount}
          specialInterviews={specialInterviews}
          onUpdate={setSpecialInterviews}
        />
      )}

      {/* 企業評価モーダル（代理登録） */}
      {ratingModal.isOpen &&
        ratingModal.isCompanyRating &&
        ratingModal.companyId &&
        ratingModal.candidateId && (
          <RecruiterRatingModal
            isOpen={ratingModal.isOpen}
            onClose={() => {
              setRatingModal({
                isOpen: false,
                candidateId: null,
                candidateName: "",
                companyId: null,
                companyName: "",
                existingRating: null,
                existingComment: null,
                isCompanyRating: false,
                candidateRating: null,
              });
            }}
            onSuccess={async () => {
              // 評価状況を再取得
              if (selectedEventId) {
                await fetchEvaluationStatus(selectedEventId);
              }
            }}
            companyId={ratingModal.companyId || ""}
            recruiterId="" // 管理者が代理で評価するため空文字（企業単位の評価として扱う）
            candidateId={ratingModal.candidateId || ""}
            eventId={selectedEventId}
            candidateName={ratingModal.candidateName}
            candidateKana={ratingModal.candidateKana}
            seatNumber={ratingModal.seatNumber}
            schoolName={ratingModal.schoolName}
            candidateRating={ratingModal.candidateRating}
            candidateLikedPoints={ratingModal.candidateLikedPoints || null}
            recruiterName="管理者" // 管理者が代理で評価
          />
        )}

      {/* 学生評価モーダル（代理登録） */}
      {ratingModal.isOpen &&
        !ratingModal.isCompanyRating &&
        ratingModal.candidateId &&
        ratingModal.companyId && (
          <CandidateRatingModal
            isOpen={ratingModal.isOpen}
            onClose={() => {
              setRatingModal({
                isOpen: false,
                candidateId: null,
                candidateName: "",
                companyId: null,
                companyName: "",
                existingRating: null,
                existingComment: null,
                isCompanyRating: false,
                candidateRating: null,
                candidateLikedPoints: null,
              });
            }}
            onSuccess={async () => {
              // 評価状況を再取得
              if (selectedEventId) {
                await fetchEvaluationStatus(selectedEventId);
              }
            }}
            candidateId={ratingModal.candidateId}
            companyId={ratingModal.companyId}
            eventId={selectedEventId}
            candidateName={ratingModal.candidateName}
            companyName={ratingModal.companyName}
            existingRating={ratingModal.existingRating}
            existingLikedPoints={ratingModal.candidateLikedPoints || null}
            isAdmin={true}
          />
        )}
    </div>
  );
}
