"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { RATING_NUMBER_MAP } from "@/types/rating.types";

export type ScoreSheetData = {
  candidateId: string;
  candidateName: string;
  candidateKana: string;
  seatNumber: string | null;
  eventName: string;
  eventDate: string;
  companies: Array<{
    companyId: string;
    companyName: string;
    overallRating: string | null;
    logicRating: string | null;
    initiativeRating: string | null;
    cooperationRating: string | null;
    creativeRating: string | null;
    communicationRating: string | null;
    comment: string | null;
    evaluatorName: string | null;
  }>;
};

/**
 * 学生のスコアシートデータを取得（イベントベース）
 */
export async function getScoreSheetData(eventId: string, candidateId: string) {
  try {
    const supabase = await createClient();

    // イベント情報を取得
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("event_date, event_types(name)")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      return {
        success: false,
        error: "イベント情報が見つかりません",
      };
    }

    const eventName = (eventData.event_types as any)?.name || "イベント";
    const eventDate = eventData.event_date;

    // 学生情報を取得（名前は profiles から）
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id, profiles!profiles_candidate_id_fkey(last_name, first_name, last_name_kana, first_name_kana)")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      return {
        success: false,
        error: "学生情報が見つかりません",
      };
    }

    const profilesRaw = candidate.profiles as unknown;
    const candidateProfile = (Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw) as { last_name: string; first_name: string; last_name_kana: string; first_name_kana: string } | null;

    // 席番号を取得
    const { data: reservation } = await supabase
      .from("event_reservations")
      .select("seat_number")
      .eq("candidate_id", candidateId)
      .eq("event_id", eventId)
      .eq("attended", true)
      .single();

    const seatNumber = reservation?.seat_number || null;

    // イベントに参加している全企業を取得
    const { data: eventCompanies, error: companiesError } = await supabase
      .from("event_companies")
      .select("company_id, companies(id, name)")
      .eq("event_id", eventId);

    if (companiesError || !eventCompanies) {
      return {
        success: false,
        error: "企業情報の取得に失敗しました",
      };
    }

    const companies = eventCompanies.map((ec: any) => ({
      id: ec.companies.id,
      name: ec.companies.name,
    }));

    const companyIds = companies.map((c) => c.id);

    // 企業評価を取得
    const { data: ratings, error: ratingsError } = await supabase
      .from("event_ratings_recruiter_to_candidate")
      .select(
        "company_id, overall_rating, logic_rating, initiative_rating, cooperation_rating, creative_rating, communication_rating, comment, evaluator_name"
      )
      .eq("event_id", eventId)
      .eq("candidate_id", candidateId)
      .in("company_id", companyIds);

    if (ratingsError) {
      return {
        success: false,
        error: "評価データの取得に失敗しました",
      };
    }

    // 評価データをマップ
    const ratingsMap = new Map(
      (ratings || []).map((r) => [
        r.company_id,
        {
          overallRating:
            r.overall_rating !== null
              ? RATING_NUMBER_MAP[
                  r.overall_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          logicRating:
            r.logic_rating !== null
              ? RATING_NUMBER_MAP[
                  r.logic_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          initiativeRating:
            r.initiative_rating !== null
              ? RATING_NUMBER_MAP[
                  r.initiative_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          cooperationRating:
            r.cooperation_rating !== null
              ? RATING_NUMBER_MAP[
                  r.cooperation_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          creativeRating:
            r.creative_rating !== null
              ? RATING_NUMBER_MAP[
                  r.creative_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          communicationRating:
            r.communication_rating !== null
              ? RATING_NUMBER_MAP[
                  r.communication_rating as keyof typeof RATING_NUMBER_MAP
                ] || null
              : null,
          comment: r.comment || null,
          evaluatorName: r.evaluator_name || null,
        },
      ])
    );

    // 評価がある企業のみを表示するか、全企業を表示するか。
    // レーダーチャートで見たいので、評価がある企業のみに絞り込む
    const ratedCompanies = companies.filter((c) => ratingsMap.has(c.id));

    // 企業名でソート
    const sortedCompanies = ratedCompanies.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // データを整形
    const companyData = sortedCompanies.map((company) => {
      const rating = ratingsMap.get(company.id);
      return {
        companyId: company.id,
        companyName: company.name,
        overallRating: rating?.overallRating || null,
        logicRating: rating?.logicRating || null,
        initiativeRating: rating?.initiativeRating || null,
        cooperationRating: rating?.cooperationRating || null,
        creativeRating: rating?.creativeRating || null,
        communicationRating: rating?.communicationRating || null,
        comment: rating?.comment || null,
        evaluatorName: rating?.evaluatorName || null,
      };
    });

    return {
      success: true,
      data: {
        candidateId: candidate.id,
        candidateName: candidateProfile ? `${candidateProfile.last_name} ${candidateProfile.first_name}` : "不明",
        candidateKana: candidateProfile ? `${candidateProfile.last_name_kana} ${candidateProfile.first_name_kana}` : "不明",
        seatNumber,
        eventName: eventName,
        eventDate: eventDate,
        companies: companyData,
      } as ScoreSheetData,
    };
  } catch (error: unknown) {
    logger.error({ action: "getScoreSheetData", err: error, eventId, candidateId }, "スコアシートデータの取得に失敗しました");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "スコアシートデータの取得に失敗しました",
    };
  }
}

/**
 * イベントに参加した全学生を取得
 */
export async function getEventCandidates(eventId: string) {
  try {
    const supabase = await createClient();

    const { data: reservations, error } = await supabase
      .from("event_reservations")
      .select(
        `
        candidate_id,
        seat_number,
        candidates (
          id,
          profiles!profiles_candidate_id_fkey(last_name, first_name, last_name_kana, first_name_kana)
        )
      `
      )
      .eq("event_id", eventId)
      .eq("attended", true)
      .order("seat_number");

    if (error) {
      return {
        success: false,
        error: "学生リストの取得に失敗しました",
      };
    }

    const candidates = (reservations || []).map((r: any) => {
      const pRaw = r.candidates?.profiles;
      const p = Array.isArray(pRaw) ? pRaw[0] : pRaw;
      return {
        id: r.candidate_id,
        name: p ? `${p.last_name} ${p.first_name}` : "不明",
        kana: p ? `${p.last_name_kana} ${p.first_name_kana}` : "不明",
        seatNumber: r.seat_number,
      };
    });

    return {
      success: true,
      candidates,
    };
  } catch (error: unknown) {
    logger.error({ action: "getEventCandidates", err: error, eventId }, "学生リストの取得に失敗しました");
    return {
      success: false,
      error: "予期しないエラーが発生しました",
    };
  }
}

/**
 * マッチングセッションに含まれるすべての学生IDを取得
 */
export async function getCandidateIdsFromMatchingSession(
  matchingSessionId: string
) {
  try {
    const supabase = await createClient();

    const { data: results, error } = await supabase
      .from("matching_results")
      .select("candidate_id")
      .eq("matching_session_id", matchingSessionId);

    if (error) {
      return {
        success: false,
        error: "学生IDの取得に失敗しました",
      };
    }

    const candidateIds = Array.from(
      new Set((results || []).map((r) => r.candidate_id))
    );

    return {
      success: true,
      candidateIds,
    };
  } catch (error: unknown) {
    logger.error({ action: "getCandidateIdsFromMatchingSession", err: error, matchingSessionId }, "学生IDの取得に失敗しました");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "学生IDの取得に失敗しました",
    };
  }
}
