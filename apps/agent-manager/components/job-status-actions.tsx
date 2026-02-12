"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveJob, rejectJob } from "@/lib/actions/job-actions";

interface JobStatusActionsProps {
  jobId: string;
}

export function JobStatusActions({ jobId }: JobStatusActionsProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    const { error } = await approveJob(jobId);
    if (error) {
      alert(`承認に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!confirm("この求人を却下しますか？")) {
      return;
    }
    setProcessing(true);
    const { error } = await rejectJob(jobId);
    if (error) {
      alert(`却下に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm" onClick={handleApprove} disabled={processing}>
        <Check className="mr-1 h-3 w-3" />
        承認
      </Button>
      <Button variant="destructive" size="sm" onClick={handleReject} disabled={processing}>
        <X className="mr-1 h-3 w-3" />
        却下
      </Button>
    </div>
  );
}

