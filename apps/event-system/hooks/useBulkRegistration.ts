import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CandidateWithEmail } from "@/types/candidate.types";
import { filterCandidates } from "@/utils/data/candidate";
import type { FormattedReservation } from "@/utils/events/reservation";

type RegistrationResult = {
  success: number;
  failed: number;
  errors: string[];
};

type UseBulkRegistrationReturn = {
  allJobSeekers: CandidateWithEmail[]; // 後方互換性のため名前は維持
  selectedJobSeekerIds: Set<string>; // 後方互換性のため名前は維持
  searchKeyword: string;
  isRegistering: boolean;
  registrationResult: RegistrationResult | null;
  filteredJobSeekers: CandidateWithEmail[]; // 後方互換性のため名前は維持
  setSearchKeyword: (keyword: string) => void;
  toggleSelection: (jobSeekerId: string) => void; // 後方互換性のため名前は維持
  clearSelection: () => void;
  fetchAllJobSeekers: () => Promise<void>; // 後方互換性のため名前は維持
  registerBulk: (
    eventId: string,
    reservations: FormattedReservation[]
  ) => Promise<RegistrationResult>;
  reset: () => void;
};

/**
 * 一括登録管理のカスタムフック
 */
export function useBulkRegistration(): UseBulkRegistrationReturn {
  const [allJobSeekers, setAllJobSeekers] = useState<CandidateWithEmail[]>([]);
  const [selectedJobSeekerIds, setSelectedJobSeekerIds] = useState<Set<string>>(
    new Set()
  );
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] =
    useState<RegistrationResult | null>(null);

  const fetchAllJobSeekers = useCallback(async () => {
    const supabase = createClient();
    // 必要なカラムのみを取得（パフォーマンス最適化）
    const { data, error } = await supabase
      .from("candidates")
      .select("id, last_name, first_name, last_name_kana, first_name_kana, phone, school_name, profiles!profiles_candidate_id_fkey(email)")
      .order("last_name_kana", { ascending: true });

    // エラーがある場合のみ処理（空のオブジェクトは無視）
    // Supabaseのエラーオブジェクトは通常、messageまたはcodeプロパティを持つ
    // 空のオブジェクト{}の場合はエラーとして扱わない
    if (error && error !== null) {
      const errorKeys = Object.keys(error);
      const isEmptyObject = errorKeys.length === 0;
      const hasErrorContent = error.message || error.code || (!isEmptyObject && errorKeys.some(key => {
        const errorObj = error as unknown as Record<string, unknown>;
        return errorObj[key] !== undefined && errorObj[key] !== null;
      }));
      
      if (hasErrorContent && !isEmptyObject) {
        console.error("学生一覧取得エラー:", error);
        const errorMessage = error.message || error.code || "不明なエラー";
        console.error(`エラー詳細: ${errorMessage}`);
        return;
      }
    }

    // データをCandidateWithEmail型に変換（profilesからemailを取得）
    type DataRow = (NonNullable<typeof data>)[number];
    const profileEmail = (item: DataRow) => {
      const p = (item as { profiles?: { email: string | null } | { email: string | null }[] | null }).profiles;
      return Array.isArray(p) ? p[0]?.email ?? null : p?.email ?? null;
    };
    const candidates = (data || []).map((item) => ({
      id: item.id,
      last_name: item.last_name || "",
      first_name: item.first_name || "",
      last_name_kana: item.last_name_kana || "",
      first_name_kana: item.first_name_kana || "",
      email: profileEmail(item) ?? "",
      phone: item.phone || null,
      school_name: item.school_name || null,
      assigned_to: null,
      created_at: new Date().toISOString(),
      date_of_birth: null,
      desired_industry: null,
      desired_job_type: null,
      entry_channel: null,
      gender: null,
      graduation_year: null,
      major: null,
      notes: null,
      updated_at: new Date().toISOString(),
      utm_campaign: null,
      utm_content: null,
      utm_medium: null,
      utm_source: null,
      utm_term: null,
    })) as unknown as CandidateWithEmail[];

    setAllJobSeekers(candidates);
  }, []);

  const toggleSelection = useCallback((jobSeekerId: string) => {
    setSelectedJobSeekerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobSeekerId)) {
        newSet.delete(jobSeekerId);
      } else {
        newSet.add(jobSeekerId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobSeekerIds(new Set());
  }, []);

  const registerBulk = useCallback(
    async (
      eventId: string,
      reservations: FormattedReservation[]
    ): Promise<RegistrationResult> => {
      setIsRegistering(true);
      setRegistrationResult(null);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      try {
        for (const jobSeekerId of selectedJobSeekerIds) {
          const candidate = allJobSeekers.find((c) => c.id === jobSeekerId);
          if (!candidate) {
            errors.push(`ID ${jobSeekerId}: 学生が見つかりません`);
            failedCount++;
            continue;
          }

          // 既に予約済みかチェック（reservationsパラメータとデータベースの両方を確認）
          const alreadyReservedInList = reservations.some(
            (r) => r.candidate_id === jobSeekerId
          );

          // データベースからも直接確認（より確実）
          const supabase = createClient();
          const { data: existingReservation } = await supabase
            .from("event_reservations")
            .select("id")
            .eq("event_id", eventId)
            .eq("candidate_id", jobSeekerId)
            .single();

          if (alreadyReservedInList || existingReservation) {
            errors.push(
              `${candidate.last_name} ${candidate.first_name}: 既に予約済みです`
            );
            failedCount++;
            continue;
          }

          // 予約登録
          const { error: insertError } = await supabase
            .from("event_reservations")
            .insert({
              event_id: eventId,
              candidate_id: jobSeekerId,
              status: "reserved",
              attended: false,
              seat_number: null,
            });

          if (insertError) {
            // ユニーク制約違反の場合は分かりやすいメッセージに変換
            let errorMessage = insertError.message || "登録エラー";
            if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
              errorMessage = "既に予約済みです";
            }
            errors.push(
              `${candidate.last_name} ${candidate.first_name}: ${errorMessage}`
            );
            failedCount++;
          } else {
            successCount++;
          }
        }

        const result: RegistrationResult = {
          success: successCount,
          failed: failedCount,
          errors,
        };

        setRegistrationResult(result);
        return result;
      } finally {
        setIsRegistering(false);
      }
    },
    [selectedJobSeekerIds, allJobSeekers]
  );

  const reset = useCallback(() => {
    setSelectedJobSeekerIds(new Set());
    setSearchKeyword("");
    setRegistrationResult(null);
  }, []);

  const filteredJobSeekers = filterCandidates(allJobSeekers, searchKeyword);

  return {
    allJobSeekers,
    selectedJobSeekerIds,
    searchKeyword,
    isRegistering,
    registrationResult,
    filteredJobSeekers,
    setSearchKeyword,
    toggleSelection,
    clearSelection,
    fetchAllJobSeekers,
    registerBulk,
    reset,
  };
}

