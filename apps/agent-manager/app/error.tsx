"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/actions/error-report-actions";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      message: error.message,
      digest: error.digest,
      url: window.location.href,
    });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">エラーが発生しました</h2>
      <p className="text-muted-foreground">
        問題が解決しない場合は、ページを再読み込みしてください。
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        もう一度試す
      </button>
    </div>
  );
}
