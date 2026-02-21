import type { CandidateWithEmail } from "@/types/candidate.types";

/**
 * 学生データを検索キーワードでフィルタリング
 */
export function filterCandidates(
  candidates: CandidateWithEmail[],
  keyword: string
): CandidateWithEmail[] {
  if (!keyword.trim()) return candidates;

  const lowerKeyword = keyword.toLowerCase();

  return candidates.filter((c) => {
    const fullName = `${c.last_name} ${c.first_name}`.toLowerCase();
    const fullNameKana = `${c.last_name_kana} ${c.first_name_kana}`.toLowerCase();
    const email = (c.email ?? "").toLowerCase();
    const schoolName = (c.school_name || "").toLowerCase();

    return (
      fullName.includes(lowerKeyword) ||
      fullNameKana.includes(lowerKeyword) ||
      email.includes(lowerKeyword) ||
      schoolName.includes(lowerKeyword)
    );
  });
}

// 後方互換性のため、filterJobSeekersもエクスポート（非推奨）
/** @deprecated Use filterCandidates instead */
export const filterJobSeekers = filterCandidates;

