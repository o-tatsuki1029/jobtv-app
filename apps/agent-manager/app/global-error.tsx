"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/actions/error-report-actions";

export default function GlobalError({
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
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>エラーが発生しました</h2>
          <p>問題が解決しない場合は、ページを再読み込みしてください。</p>
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", backgroundColor: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  );
}
