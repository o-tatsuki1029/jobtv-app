/**
 * 求職者情報の表示用ユーティリティ関数
 * 名前は profiles に集約されているため、profiles 経由で取得する
 */

type CandidateWithProfiles = {
  profiles?: {
    first_name?: string | null;
    last_name?: string | null;
    first_name_kana?: string | null;
    last_name_kana?: string | null;
  } | null;
};

/**
 * 求職者の表示名を取得（profiles から）
 */
export function getCandidateDisplayName(
  candidate: CandidateWithProfiles | null | undefined,
): string {
  if (!candidate?.profiles) {
    return "不明";
  }

  const lastName = candidate.profiles.last_name;
  const firstName = candidate.profiles.first_name;

  if (lastName && firstName) {
    return `${lastName} ${firstName}`;
  }
  if (lastName) return lastName;
  if (firstName) return firstName;

  return "不明";
}

/**
 * 求職者のカナ名を取得（profiles から）
 */
export function getCandidateDisplayKana(
  candidate: CandidateWithProfiles | null | undefined,
): string {
  if (!candidate?.profiles) {
    return "";
  }

  const parts: string[] = [];
  if (candidate.profiles.last_name_kana) parts.push(candidate.profiles.last_name_kana);
  if (candidate.profiles.first_name_kana) parts.push(candidate.profiles.first_name_kana);

  return parts.length > 0 ? parts.join(" ") : "";
}
