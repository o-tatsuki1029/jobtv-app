"use client";

import { Loader2 } from "lucide-react";
import { primaryButtonClass } from "@/constants/navigation";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Props {
  loading: boolean;
  onReserve: () => void;
}

export default function ExistingCandidateConfirm({ loading, onReserve }: Props) {
  return (
    <>
      <p className="text-gray-700 text-xs text-center">
        <a href="/docs/terms" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">利用規約</a>
        および
        <a href="https://vectorinc.co.jp/privacy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">プライバシーポリシー</a>
        に同意のうえ、予約を確定してください。
      </p>
      <button
        type="button"
        onClick={onReserve}
        disabled={loading}
        className={cn(
          "mx-auto block w-auto min-w-[12rem] px-8 py-4 text-sm rounded-lg font-medium",
          primaryButtonClass,
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            予約中...
          </span>
        ) : (
          "予約する"
        )}
      </button>
    </>
  );
}
