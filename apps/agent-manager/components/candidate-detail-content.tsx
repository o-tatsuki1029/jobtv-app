import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CandidateApplicationsSection } from "@/components/candidate-applications-section";
import { CandidateApplicationsDetail } from "@/components/candidate-applications-detail";
import { CandidateInfoDisplay } from "@/components/candidate-info-display";
import {
  getCandidate,
  getCandidateApplications,
} from "@/lib/actions/candidate-actions";
import { getCandidateDisplayName } from "@/utils";

interface CandidateDetailContentProps {
  id: string;
}

export async function CandidateDetailContent({
  id,
}: CandidateDetailContentProps) {
  // Server Actions経由でデータを取得
  const { data: candidate, error: candidateError } = await getCandidate(id);

  if (candidateError || !candidate) {
    redirect("/admin/candidates");
  }

  // この求職者の応募履歴を取得
  const { data: applications, error: applicationsError } =
    await getCandidateApplications(id);

  if (applicationsError) {
    console.error("Error fetching applications:", applicationsError);
  }

  if (!candidate.id) {
    redirect("/admin/candidates");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getCandidateDisplayName(candidate)}
          </h1>
          <p className="text-sm text-muted-foreground">
            この求職者の状態を管理します
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/candidates">← 一覧に戻る</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <CandidateApplicationsSection
          candidateId={candidate.id}
          applications={applications || []}
        />
        <CandidateApplicationsDetail candidateId={candidate.id} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">求職者情報</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CandidateInfoDisplay
            candidate={{
              id: candidate.id,
              profiles: candidate.profiles,
              phone: candidate.phone,
              notes: candidate.notes,
              graduation_year: candidate.graduation_year,
              assigned_to: candidate.assigned_to,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
