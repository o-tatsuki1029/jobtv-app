"use client";

import { useState, useEffect } from "react";
import { getCandidate, type CandidateData } from "@/lib/actions/candidate-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CandidateForm } from "@/components/candidate-form";
import { useRouter } from "next/navigation";

interface CandidateDetailModalProps {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailModal({
  candidateId,
  open,
  onOpenChange,
}: CandidateDetailModalProps) {
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && candidateId) {
      fetchCandidate();
    } else {
      setCandidate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidateId]);

  const fetchCandidate = async () => {
    if (!candidateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getCandidate(candidateId);

      if (fetchError || !data || !data.id) {
        throw new Error(fetchError || "データの取得に失敗しました");
      }
      setCandidate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : candidate ? (
          <>
            <DialogHeader>
              <DialogTitle>求職者情報を編集</DialogTitle>
              <DialogDescription>求職者情報を編集します</DialogDescription>
            </DialogHeader>
            <CandidateForm
              initialData={{
                id: candidate.id,
                first_name: candidate.profiles?.first_name ?? "",
                last_name: candidate.profiles?.last_name ?? "",
                first_name_kana: candidate.profiles?.first_name_kana ?? "",
                last_name_kana: candidate.profiles?.last_name_kana ?? "",
                email: candidate.profiles?.email ?? "",
                phone: candidate.phone || "",
                notes: candidate.notes || "",
              }}
              onSuccess={handleSuccess}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
