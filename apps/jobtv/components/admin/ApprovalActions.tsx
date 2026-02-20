"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

interface ApprovalActionsProps {
  onApprove: () => Promise<{ error: string | null }>;
  onReject: () => Promise<{ error: string | null }>;
  approveLabel?: string;
  rejectLabel?: string;
  vertical?: boolean;
  approveDisabled?: boolean;
}

export default function ApprovalActions({
  onApprove,
  onReject,
  approveLabel = "承認",
  rejectLabel = "却下",
  vertical = false,
  approveDisabled = false,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    const { error } = await onApprove();
    if (error) {
      alert(`承認に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!confirm("却下しますか？この操作は取り消せません。")) {
      return;
    }
    setProcessing(true);
    const { error } = await onReject();
    if (error) {
      alert(`却下に失敗しました: ${error}`);
    } else {
      router.refresh();
    }
    setProcessing(false);
  };

  return (
    <div className={`flex ${vertical ? "flex-col w-full" : "items-center"} gap-2`}>
      <StudioButton
        onClick={handleApprove}
        disabled={processing || approveDisabled}
        className={`bg-green-600 hover:bg-green-700 text-white ${vertical ? "w-full" : ""} ${
          approveDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Check className="mr-1 h-4 w-4" />
        {approveLabel}
      </StudioButton>
      <StudioButton
        onClick={handleReject}
        disabled={processing}
        className={`bg-red-600 hover:bg-red-700 text-white ${vertical ? "w-full" : ""}`}
      >
        <X className="mr-1 h-4 w-4" />
        {rejectLabel}
      </StudioButton>
    </div>
  );
}
