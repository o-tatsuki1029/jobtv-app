"use server";

import { createClient } from "@/lib/supabase/server";
import { generateMatchScores, generateMatching } from "@/utils/data/matching";
import { MatchingWeights, SpecialInterviewInput } from "@/types/matching.types";
import { RATING_NUMBER_MAP } from "@/types/rating.types";

/**
 * マッチングを実行
 */
export async function executeMatching(
  eventId: string,
  sessionCount: number,
  weights: MatchingWeights,
  specialInterviews: SpecialInterviewInput[]
) {
  try {
    const supabase = await createClient();

    // 既存のマッチングセッションを確認（同じイベントで未完了のものがあれば削除）
    const { data: existingSessions } = await supabase
      .from("event_matching_sessions")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "pending");

    if (existingSessions && existingSessions.length > 0) {
      // 既存の結果を削除
      for (const session of existingSessions) {
        await supabase
          .from("matching_results")
          .delete()
          .eq("matching_session_id", session.id);
      }
      // 既存のセッションを削除
      await supabase
        .from("event_matching_sessions")
        .delete()
        .eq("event_id", eventId)
        .eq("status", "pending");
    }

    // 特別面談をJSONB形式に変換
    const specialInterviewsJson = specialInterviews.map((si) => ({
      companyId: si.companyId,
      candidateId: si.candidateId,
      sessionNumber: si.sessionNumber,
    }));

    // マッチングセッションを作成（特別面談もJSONBで保存）
    const { data: session, error: sessionError } = await supabase
      .from("event_matching_sessions")
      .insert({
        event_id: eventId,
        session_count: sessionCount,
        company_weight: weights.companyWeight,
        candidate_weight: weights.candidateWeight,
        special_interviews: specialInterviewsJson,
        status: "pending",
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("セッション作成エラー:", sessionError);
      return {
        success: false,
        error: "マッチングセッションの作成に失敗しました",
      };
    }

    // イベントに参加している企業を取得
    const { data: eventCompanies, error: companiesError } = await supabase
      .from("event_companies")
      .select("company_id")
      .eq("event_id", eventId);

    if (companiesError || !eventCompanies) {
      console.error("企業取得エラー:", companiesError);
      return {
        success: false,
        error: "参加企業の取得に失敗しました",
      };
    }

    const companyIds = eventCompanies.map((ec) => ec.company_id);

    // イベントに出席登録している学生を取得
    const { data: reservations, error: reservationsError } = await supabase
      .from("event_reservations")
      .select("candidate_id")
      .eq("event_id", eventId)
      .eq("attended", true);

    if (reservationsError || !reservations) {
      console.error("学生取得エラー:", reservationsError);
      return {
        success: false,
        error: "出席学生の取得に失敗しました",
      };
    }

    const candidateIds = Array.from(
      new Set(reservations.map((r) => r.candidate_id))
    );

    // 企業評価を取得
    const { data: companyRatings, error: companyRatingsError } = await supabase
      .from("event_ratings_recruiter_to_candidate")
      .select("company_id, candidate_id, overall_rating")
      .eq("event_id", eventId)
      .in("company_id", companyIds)
      .in("candidate_id", candidateIds)
      .not("overall_rating", "is", null);

    console.log("企業評価取得結果:", {
      count: companyRatings?.length || 0,
      sample: companyRatings?.slice(0, 3),
    });

    if (companyRatingsError) {
      console.error("企業評価取得エラー:", companyRatingsError);
      return {
        success: false,
        error: "企業評価の取得に失敗しました",
      };
    }

    // 学生評価を取得
    const { data: candidateRatings, error: candidateRatingsError } =
      await supabase
        .from("event_ratings_candidate_to_company")
        .select("company_id, candidate_id, rating")
        .eq("event_id", eventId)
        .in("company_id", companyIds)
        .in("candidate_id", candidateIds);

    console.log("学生評価取得結果:", {
      count: candidateRatings?.length || 0,
      sample: candidateRatings?.slice(0, 3),
    });

    if (candidateRatingsError) {
      console.error("学生評価取得エラー:", candidateRatingsError);
      return {
        success: false,
        error: "学生評価の取得に失敗しました",
      };
    }

    // 企業評価を数値から文字列（S/A/B/C）に変換
    const companyRatingsConverted = (companyRatings || []).map((r) => {
      // overall_ratingは数値（1-4）として保存されているので、文字列に変換
      const ratingNumber = r.overall_rating;
      const ratingGrade =
        ratingNumber !== null
          ? RATING_NUMBER_MAP[ratingNumber as keyof typeof RATING_NUMBER_MAP] ||
            null
          : null;
      return {
        companyId: r.company_id,
        candidateId: r.candidate_id,
        rating: ratingGrade,
      };
    });

    // 学生評価を数値に変換
    const candidateRatingsConverted = (candidateRatings || []).map((r) => ({
      companyId: r.company_id,
      candidateId: r.candidate_id,
      rating: r.rating,
    }));

    // マッチングスコアを生成
    const matchScores = generateMatchScores(
      companyRatingsConverted.map((r) => ({
        companyId: r.companyId,
        candidateId: r.candidateId,
        rating: r.rating,
      })),
      candidateRatingsConverted,
      weights
    );

    console.log("マッチングスコア生成結果:", {
      count: matchScores.length,
      sample: matchScores.slice(0, 5),
    });

    // マッチング結果を生成
    const matchingResults = generateMatching(
      companyIds,
      candidateIds,
      sessionCount,
      matchScores,
      specialInterviews
    );

    console.log("マッチング結果生成:", {
      count: matchingResults.length,
      totalAssignments: matchingResults.reduce(
        (sum, r) => sum + r.candidateIds.length,
        0
      ),
      sample: matchingResults.slice(0, 3).map((r) => ({
        session: r.sessionNumber,
        company: r.companyId,
        students: r.candidateIds.length,
      })),
    });

    // マッチング結果を保存（スコアは保存しない）
    const resultInserts: Array<{
      matching_session_id: string;
      session_number: number;
      company_id: string;
      candidate_id: string;
      is_special_interview: boolean;
    }> = [];

    matchingResults.forEach((result) => {
      result.candidateIds.forEach((candidateId) => {
        const isSpecial = result.specialInterviewIds.has(candidateId);

        resultInserts.push({
          matching_session_id: session.id,
          session_number: result.sessionNumber,
          company_id: result.companyId,
          candidate_id: candidateId,
          is_special_interview: isSpecial,
        });
      });
    });

    if (resultInserts.length > 0) {
      const { error: resultsError } = await supabase
        .from("matching_results")
        .insert(resultInserts);

      if (resultsError) {
        console.error("マッチング結果保存エラー:", resultsError);
        return {
          success: false,
          error: `マッチング結果の保存に失敗しました: ${
            resultsError.message || resultsError.code || "不明なエラー"
          }`,
        };
      }
      console.log(`マッチング結果を${resultInserts.length}件保存しました`);
    } else {
      console.warn(
        "マッチング結果が0件です。マッチングアルゴリズムを確認してください。"
      );
    }

    // セッションステータスを完了に更新
    const { error: updateError } = await supabase
      .from("event_matching_sessions")
      .update({ status: "completed" })
      .eq("id", session.id);

    if (updateError) {
      console.error("セッション更新エラー:", updateError);
      return {
        success: false,
        error: "セッションの更新に失敗しました",
      };
    }

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error: unknown) {
    console.error("マッチング実行エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

/**
 * マッチングセッションを取得
 */
export async function getMatchingSession(eventId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_matching_sessions")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (error && errorCode !== "PGRST116") {
      console.error("セッション取得エラー:", error);
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "セッション取得に失敗しました";
      return { success: false, error: errorMessage };
    }

    return { success: true, session: data || null };
  } catch (error: unknown) {
    console.error("セッション取得エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "セッション取得に失敗しました",
    };
  }
}

/**
 * イベントのすべての完了済みマッチングセッションを取得
 */
export async function getAllMatchingSessions(eventId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_matching_sessions")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("セッション取得エラー:", error);
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "セッション取得に失敗しました";
      return { success: false, error: errorMessage };
    }

    return { success: true, sessions: data || [] };
  } catch (error: unknown) {
    console.error("セッション取得エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "セッション取得に失敗しました",
    };
  }
}

/**
 * マッチング結果を取得（スコアは都度計算）
 */
export async function getMatchingResults(matchingSessionId: string) {
  try {
    const supabase = await createClient();

    // マッチングセッションを取得（重みとイベントIDを取得）
    const { data: session, error: sessionError } = await supabase
      .from("event_matching_sessions")
      .select("event_id, company_weight, candidate_weight")
      .eq("id", matchingSessionId)
      .single();

    if (sessionError) {
      console.error("セッション取得エラー:", sessionError);
      return { success: false, error: sessionError.message };
    }

    // マッチング結果を取得
    const { data: results, error: resultsError } = await supabase
      .from("matching_results")
      .select("*")
      .eq("matching_session_id", matchingSessionId)
      .order("session_number")
      .order("company_id");

    if (resultsError) {
      console.error("結果取得エラー:", resultsError);
      return { success: false, error: resultsError.message };
    }

    if (!results || results.length === 0) {
      return { success: true, results: [] };
    }

    // 企業IDと学生IDを収集
    const companyIds = Array.from(new Set(results.map((r) => r.company_id)));
    const candidateIds = Array.from(
      new Set(results.map((r) => r.candidate_id))
    );

    // 企業評価を取得
    const { data: companyRatings, error: companyRatingsError } = await supabase
      .from("event_ratings_recruiter_to_candidate")
      .select(
        "company_id, candidate_id, communication_rating, cooperation_rating, creative_rating, initiative_rating, logic_rating, overall_rating, comment"
      )
      .eq("event_id", session.event_id)
      .in("company_id", companyIds)
      .in("candidate_id", candidateIds)
      .not("overall_rating", "is", null);

    if (companyRatingsError) {
      console.error("企業評価取得エラー:", companyRatingsError);
      return { success: false, error: companyRatingsError.message };
    }

    // 学生評価を取得
    const { data: candidateRatings, error: candidateRatingsError } =
      await supabase
        .from("event_ratings_candidate_to_company")
        .select("company_id, candidate_id, rating")
        .eq("event_id", session.event_id)
        .in("company_id", companyIds)
        .in("candidate_id", candidateIds);

    if (candidateRatingsError) {
      console.error("学生評価取得エラー:", candidateRatingsError);
      return { success: false, error: candidateRatingsError.message };
    }

    // 企業評価を数値から文字列（S/A/B/C）に変換
    const companyRatingsConverted = (companyRatings || []).map((r) => {
      const ratingNumber = r.overall_rating;
      const ratingGrade =
        ratingNumber !== null
          ? RATING_NUMBER_MAP[ratingNumber as keyof typeof RATING_NUMBER_MAP] ||
            null
          : null;
      return {
        companyId: r.company_id,
        candidateId: r.candidate_id,
        rating: ratingGrade,
      };
    });

    // 学生評価を数値に変換
    const candidateRatingsConverted = (candidateRatings || []).map((r) => ({
      companyId: r.company_id,
      candidateId: r.candidate_id,
      rating: r.rating,
    }));

    // 企業評価マップを作成
    const companyRatingMap = new Map<string, any>();
    (companyRatings || []).forEach((r) => {
      const key = `${r.company_id}_${r.candidate_id}`;
      companyRatingMap.set(key, r);
    });

    // 学生評価マップを作成（評価状態を確認するため）
    const candidateRatingMap = new Map<string, number | null>();
    candidateRatingsConverted.forEach((r) => {
      const key = `${r.companyId}_${r.candidateId}`;
      candidateRatingMap.set(key, r.rating);
    });

    // マッチングスコアを都度計算
    const weights: MatchingWeights = {
      companyWeight: Number(session.company_weight),
      candidateWeight: Number(session.candidate_weight),
    };

    const matchScores = generateMatchScores(
      companyRatingsConverted,
      candidateRatingsConverted,
      weights
    );

    // スコアマップを作成
    const scoreMap = new Map<string, number>();
    matchScores.forEach((ms) => {
      const key = `${ms.companyId}_${ms.candidateId}`;
      scoreMap.set(key, ms.score);
    });

    // 企業情報を取得
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);

    if (companiesError) {
      console.error("企業取得エラー:", companiesError);
      return { success: false, error: companiesError.message };
    }

    // 学生情報を取得
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, last_name, first_name, last_name_kana, first_name_kana")
      .in("id", candidateIds);

    if (candidatesError) {
      console.error("学生取得エラー:", candidatesError);
      return { success: false, error: candidatesError.message };
    }

    // 席番号を取得
    const { data: reservations, error: reservationsError } = await supabase
      .from("event_reservations")
      .select("candidate_id, seat_number")
      .eq("event_id", session.event_id)
      .in("candidate_id", candidateIds)
      .eq("attended", true);

    if (reservationsError) {
      console.error("席番号取得エラー:", reservationsError);
      // エラーでも続行
    }

    // 席番号マップを作成
    const seatNumberMap = new Map<string, string | null>();
    type ReservationItem = {
      candidate_id: string;
      seat_number: string | null;
    };
    (reservations || []).forEach((r: ReservationItem) => {
      if (!seatNumberMap.has(r.candidate_id)) {
        seatNumberMap.set(r.candidate_id, r.seat_number || null);
      }
    });

    // 企業と学生のマップを作成
    const companyMap = new Map((companies || []).map((c) => [c.id, c]));
    const candidateMap = new Map((candidates || []).map((c) => [c.id, c]));

    // 結果に企業と学生の情報を結合し、スコアと評価情報を追加
    const enrichedResults = results.map((result) => {
      const candidate = candidateMap.get(result.candidate_id);
      const scoreKey = `${result.company_id}_${result.candidate_id}`;
      const matchScore = scoreMap.get(scoreKey) || null;
      const candidateRating = candidateRatingMap.get(scoreKey) || null;
      const companyRating = companyRatingMap.get(scoreKey) || {};

      return {
        ...result,
        match_score: matchScore,
        candidate_rating: candidateRating, // 学生評価を追加
        communication_rating: companyRating.communication_rating || null,
        cooperation_rating: companyRating.cooperation_rating || null,
        creative_rating: companyRating.creative_rating || null,
        initiative_rating: companyRating.initiative_rating || null,
        logic_rating: companyRating.logic_rating || null,
        overall_rating: companyRating.overall_rating || null,
        comment: companyRating.comment || null,
        companies: companyMap.get(result.company_id) || null,
        candidates: candidate
          ? {
              ...candidate,
              seat_number: seatNumberMap.get(result.candidate_id) || null,
            }
          : null,
      };
    });

    return { success: true, results: enrichedResults };
  } catch (error: unknown) {
    console.error("結果取得エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "結果取得に失敗しました",
    };
  }
}

/**
 * 特別面談一覧を取得（JSONBから取得）
 */
export async function getSpecialInterviews(matchingSessionId: string) {
  try {
    const supabase = await createClient();

    // マッチングセッションから特別面談設定を取得
    const { data: session, error: sessionError } = await supabase
      .from("event_matching_sessions")
      .select("special_interviews")
      .eq("id", matchingSessionId)
      .single();

    if (sessionError) {
      console.error("セッション取得エラー:", sessionError);
      return { success: false, error: sessionError.message };
    }

    // JSONBから特別面談データを取得
    type SpecialInterviewData = {
      company_id: string;
      candidate_id: string;
      session_number: number;
    };
    const specialInterviews =
      (session?.special_interviews as SpecialInterviewData[]) || [];

    // 企業IDと学生IDを収集
    const companyIds = Array.from(
      new Set(specialInterviews.map((si) => si.company_id))
    );
    const candidateIds = Array.from(
      new Set(specialInterviews.map((si) => si.candidate_id))
    );

    // 企業情報を取得
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);

    if (companiesError) {
      console.error("企業取得エラー:", companiesError);
      const errorMessage =
        companiesError &&
        typeof companiesError === "object" &&
        "message" in companiesError
          ? String((companiesError as { message: string }).message)
          : "企業取得に失敗しました";
      return { success: false, error: errorMessage };
    }

    // 学生情報を取得
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, last_name, first_name, last_name_kana, first_name_kana")
      .in("id", candidateIds);

    if (candidatesError) {
      console.error("学生取得エラー:", candidatesError);
      const errorMessage =
        candidatesError &&
        typeof candidatesError === "object" &&
        "message" in candidatesError
          ? String((candidatesError as { message: string }).message)
          : "学生取得に失敗しました";
      return { success: false, error: errorMessage };
    }

    // 企業と学生のマップを作成
    const companyMap = new Map((companies || []).map((c) => [c.id, c]));
    const candidateMap = new Map((candidates || []).map((j) => [j.id, j]));

    // 特別面談データに企業と学生の情報を結合
    const enrichedInterviews = specialInterviews.map((si) => {
      const company = companyMap.get(si.company_id);
      const candidate = candidateMap.get(si.candidate_id);

      return {
        id: `${si.company_id}_${si.candidate_id}_${si.session_number}`, // 仮のID
        matching_session_id: matchingSessionId,
        company_id: si.company_id,
        candidate_id: si.candidate_id,
        session_number: si.session_number,
        companies: company || null,
        candidates: candidate || null,
        created_at: null, // JSONBから取得するため、created_atはnull
      };
    });

    // セッション番号と企業IDでソート
    enrichedInterviews.sort((a, b) => {
      if (a.session_number !== b.session_number) {
        return a.session_number - b.session_number;
      }
      return a.company_id.localeCompare(b.company_id);
    });

    return { success: true, specialInterviews: enrichedInterviews };
  } catch (error: unknown) {
    console.error("特別面談取得エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "特別面談取得に失敗しました",
    };
  }
}

/**
 * イベントごとの特別面談設定を取得
 */
export async function getEventSpecialInterviews(eventId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_special_interviews")
      .select("*")
      .eq("event_id", eventId)
      .order("session_number")
      .order("company_id");

    if (error) {
      console.error("特別面談設定取得エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true, specialInterviews: data || [] };
  } catch (error: unknown) {
    console.error("特別面談設定取得エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "特別面談設定取得に失敗しました",
    };
  }
}

/**
 * イベントごとの特別面談設定を保存
 */
export async function saveEventSpecialInterviews(
  eventId: string,
  specialInterviews: SpecialInterviewInput[]
) {
  try {
    const supabase = await createClient();

    // トランザクション的に実行（削除して挿入）
    // まず既存の設定を削除
    const { error: deleteError } = await supabase
      .from("event_special_interviews")
      .delete()
      .eq("event_id", eventId);

    if (deleteError) {
      console.error("特別面談設定削除エラー:", deleteError);
      return { success: false, error: deleteError.message };
    }

    if (specialInterviews.length === 0) {
      return { success: true };
    }

    // 新しい設定を挿入
    const inserts = specialInterviews.map((si) => ({
      event_id: eventId,
      company_id: si.companyId,
      candidate_id: si.candidateId,
      session_number: si.sessionNumber,
    }));

    const { error: insertError } = await supabase
      .from("event_special_interviews")
      .insert(inserts);

    if (insertError) {
      console.error("特別面談設定保存エラー:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("特別面談設定保存エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "特別面談設定保存に失敗しました",
    };
  }
}
