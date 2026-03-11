import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate } from "@/types/candidate.types";
import type { PaginationInfo } from "@jobtv-app/shared/types";

type SortInfo<T> = {
  sortKey: keyof T;
  sortAsc: boolean;
};

type UseCandidatesParams = {
  keyword: string;
  pagination: PaginationInfo & {
    setTotalCount: (count: number) => void;
  };
  sort: SortInfo<import("@/types/candidate.types").CandidateWithEmail>;
};

type UseCandidatesReturn = {
  candidates: import("@/types/candidate.types").CandidateWithEmail[];
  isLoading: boolean;
  error: string | null;
  fetchCandidates: () => Promise<void>;
  setError: (error: string | null) => void;
};

/**
 * 学生一覧管理のカスタムフック
 */
export function useCandidates({
  keyword,
  pagination,
  sort,
}: UseCandidatesParams): UseCandidatesReturn {
  const [candidates, setCandidates] = useState<import("@/types/candidate.types").CandidateWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const from = pagination.page * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      // 必要なカラムのみを取得（名前・メールは profiles から join）
      let query = supabase.from("candidates").select(
        "id, phone, graduation_year, school_name, gender, major_field, school_type, entry_channel, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at, updated_at, profiles!profiles_candidate_id_fkey(email, last_name, first_name, last_name_kana, first_name_kana)",
        { count: "exact" }
      );

      // キーワード検索（名前・メールは profiles で検索し、電話番号は candidates で）
      if (keyword) {
        const { data: profileMatches } = await supabase
          .from("profiles")
          .select("candidate_id")
          .not("candidate_id", "is", null)
          .or(`email.ilike.%${keyword}%,last_name.ilike.%${keyword}%,first_name.ilike.%${keyword}%,last_name_kana.ilike.%${keyword}%,first_name_kana.ilike.%${keyword}%`);
        const candidateIdsFromProfiles = (profileMatches ?? []).map((p) => p.candidate_id).filter(Boolean);
        const orParts = [
          `phone.ilike.%${keyword}%`,
        ];
        if (candidateIdsFromProfiles.length > 0) {
          orParts.push(`id.in.(${candidateIdsFromProfiles.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }

      // 名前フィールドは profiles にあるため、サーバーソートは candidates のカラムのみ
      const nameFields = ["last_name", "first_name", "last_name_kana", "first_name_kana", "email"];
      const isNameSort = nameFields.includes(String(sort.sortKey));
      if (!isNameSort) {
        query = query.order(String(sort.sortKey), { ascending: sort.sortAsc });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const {
        data,
        error: queryError,
        count,
      } = await query.range(from, to);

      if (queryError) {
        console.error("取得エラー:", queryError);
        setError("学生の取得に失敗しました。もう一度お試しください。");
        setCandidates([]);
        pagination.setTotalCount(0);
        return;
      }

      // データをCandidate型に変換（名前・email は profiles からフラットに展開）
      type ProfileData = { email: string | null; last_name: string | null; first_name: string | null; last_name_kana: string | null; first_name_kana: string | null };
      type Row = (typeof data)[number] & { profiles?: ProfileData | ProfileData[] | null };
      const candidates = ((data || []) as Row[]).map((row) => {
        const { profiles: profilesRaw, ...rest } = row;
        const prof = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw;
        return {
          ...rest,
          last_name: prof?.last_name ?? "",
          first_name: prof?.first_name ?? "",
          last_name_kana: prof?.last_name_kana ?? "",
          first_name_kana: prof?.first_name_kana ?? "",
          email: prof?.email ?? null,
        } as import("@/types/candidate.types").CandidateWithEmail;
      });

      // 名前フィールドのソートはクライアントサイドで実施
      if (isNameSort) {
        const key = String(sort.sortKey) as keyof import("@/types/candidate.types").CandidateWithEmail;
        candidates.sort((a, b) => {
          const va = (a[key] as string) ?? "";
          const vb = (b[key] as string) ?? "";
          return sort.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
      }

      setCandidates(candidates);
      pagination.setTotalCount(count || 0);
    } catch (err) {
      console.error("予期しないエラー:", err);
      setError("予期しないエラーが発生しました。");
      setCandidates([]);
      pagination.setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    keyword,
    pagination.page,
    pagination.pageSize,
    pagination.setTotalCount,
    sort.sortKey,
    sort.sortAsc,
  ]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return {
    candidates,
    isLoading,
    error,
    fetchCandidates,
    setError,
  };
}

// 後方互換性のため、useJobSeekersもエクスポート（非推奨）
/** @deprecated Use useCandidates instead */
export const useJobSeekers = useCandidates;

