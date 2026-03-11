import { getCandidateDisplayName } from "@/utils";

interface CandidateInfoDisplayProps {
  candidate: {
    id: string;
    phone?: string | null;
    notes?: string | null;
    graduation_year?: number | null;
    assigned_to?: string | null;
    profiles?: { email: string | null; first_name?: string | null; last_name?: string | null; first_name_kana?: string | null; last_name_kana?: string | null } | null;
  };
}

export function CandidateInfoDisplay({ candidate }: CandidateInfoDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">氏名</p>
          <p className="text-sm font-medium mt-1">
            {getCandidateDisplayName(candidate)}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            メールアドレス
          </p>
          <p className="text-sm mt-1">{candidate.profiles?.email ?? "未設定"}</p>
        </div>

        {candidate.phone && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              電話番号
            </p>
            <p className="text-sm mt-1">{candidate.phone}</p>
          </div>
        )}

        {candidate.graduation_year && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">卒業年</p>
            <p className="text-sm mt-1">{candidate.graduation_year}年</p>
          </div>
        )}
      </div>

      {candidate.notes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">メモ</p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{candidate.notes}</p>
        </div>
      )}
    </div>
  );
}
