"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { CandidateForm } from "@/components/candidate-form";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateData } from "@/lib/actions/candidate-actions";
import { getCandidateDisplayName } from "@/utils";

type Candidate = CandidateData & { id: string };

interface CandidatesListProps {
  candidates: Candidate[];
}

export function CandidatesList({ candidates }: CandidatesListProps) {
  const [open, setOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規求職者登録</DialogTitle>
              <DialogDescription>新しい求職者を登録します</DialogDescription>
            </DialogHeader>
            <CandidateForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>求職者一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length > 0 ? (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {getCandidateDisplayName(candidate)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {candidate.profiles?.email ?? "-"}
                    </p>
                    {candidate.phone && (
                      <p className="text-sm text-muted-foreground">
                        電話: {candidate.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/candidates/${candidate.id}`}>
                        応募管理
                      </Link>
                    </Button>
                    <Dialog
                      open={detailOpen && selectedCandidateId === candidate.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setSelectedCandidateId(candidate.id);
                          setDetailOpen(true);
                        } else {
                          setDetailOpen(false);
                          setSelectedCandidateId(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCandidateId(candidate.id);
                            setDetailOpen(true);
                          }}
                        >
                          詳細
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>求職者情報を編集</DialogTitle>
                          <DialogDescription>
                            求職者情報を編集します
                          </DialogDescription>
                        </DialogHeader>
                        <CandidateForm
                          initialData={{
                            id: candidate.id,
                            first_name: candidate.first_name,
                            last_name: candidate.last_name,
                            first_name_kana: candidate.first_name_kana,
                            last_name_kana: candidate.last_name_kana,
                            email: candidate.profiles?.email ?? undefined,
                            phone: candidate.phone || "",
                            notes: candidate.notes || "",
                          }}
                          onSuccess={() => {
                            setDetailOpen(false);
                            setSelectedCandidateId(null);
                            router.refresh();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                登録されている求職者がありません
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    最初の求職者を登録
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>新規求職者登録</DialogTitle>
                    <DialogDescription>
                      新しい求職者を登録します
                    </DialogDescription>
                  </DialogHeader>
                  <CandidateForm onSuccess={handleSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
