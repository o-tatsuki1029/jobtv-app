import { getAdminClient } from "@jobtv-app/shared/supabase/admin";

export async function getCandidateCompanies(eventId: string, candidateId: string) {
  if (!eventId || !candidateId) {
    throw new Error("eventIdとcandidateIdが必要です");
  }

  // event-system はクッキー認証のため、admin client を使用（candidateId はルートハンドラで検証済み）
  const supabase = getAdminClient();

  // 学生が出席登録したイベントか確認
  const { data: reservation, error: reservationError } = await supabase
    .from("event_reservations")
    .select("id, attended")
    .eq("candidate_id", candidateId)
    .eq("event_id", eventId)
    .eq("attended", true)
    .single();

  if (reservationError || !reservation) {
    throw new Error("このイベントに出席登録されていません");
  }

  // 2つのクエリを並列実行（reservationは既に確認済み）
  const [eventCompaniesResult, ratingsResult] = await Promise.all([
    // そのイベントに参加登録している企業を取得
    supabase
      .from("event_companies")
      .select(
        `
        company_id,
        companies (
          id,
          name
        )
      `
      )
      .eq("event_id", eventId),
    // 既存の評価を取得
    supabase
      .from("event_ratings_candidate_to_company")
      .select("id, company_id, rating, comment")
      .eq("candidate_id", candidateId)
      .eq("event_id", eventId),
  ]);

  const { data: eventCompanies, error: eventCompaniesError } = eventCompaniesResult;
  const { data: existingRatings, error: ratingsError } = ratingsResult;

  if (eventCompaniesError) {
    throw new Error("企業の取得に失敗しました");
  }

  // 評価取得エラーは無視（評価が存在しない場合は空配列として扱う）

  // 評価データをマップ
  type Rating = { id?: string; company_id: string; rating: number; comment: string | null };
  type RatingRow = { id?: string; company_id: string; rating: number; comment: string | null; [key: string]: unknown };
  const ratingsMap = new Map<string, Rating>(
    (existingRatings || []).map((r: RatingRow) => [r.company_id, {
      id: r.id,
      company_id: r.company_id,
      rating: r.rating,
      comment: r.comment,
    }])
  );

  // データを整形
  type EventCompanyItem = {
    company_id: string;
    companies: { id: string; name: string }[] | { id: string; name: string } | null;
  };
  const companies = (eventCompanies || [])
    .filter((item: EventCompanyItem) => {
      if (!item.companies) return false;
      // 配列の場合は最初の要素を取得、オブジェクトの場合はそのまま
      const company = Array.isArray(item.companies) ? item.companies[0] : item.companies;
      return company !== null && company !== undefined;
    })
    .map((item: EventCompanyItem) => {
      const company = Array.isArray(item.companies) ? item.companies[0] : item.companies;
      if (!company) {
        throw new Error("企業情報が見つかりません");
      }
      const existingRating = ratingsMap.get(company.id);
      return {
        id: existingRating?.id || `${company.id}_${eventId}`,
        company_id: company.id,
        name: company.name,
        event_id: eventId,
        rating: existingRating?.rating || null,
        comment: existingRating?.comment || null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { companies };
}
