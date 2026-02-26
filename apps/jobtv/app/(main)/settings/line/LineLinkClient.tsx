"use client";

import { useState } from "react";
import { unlinkLineAccount } from "@/lib/actions/line-actions";

export function LineLinkClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlink() {
    if (loading) return;
    if (!confirm("LINE連携を解除しますか？")) return;
    setLoading(true);
    setError(null);
    const result = await unlinkLineAccount();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handleUnlink}
        disabled={loading}
        className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "解除中..." : "連携を解除"}
      </button>
    </div>
  );
}
