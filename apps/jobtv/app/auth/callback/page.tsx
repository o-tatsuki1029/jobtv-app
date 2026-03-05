"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");

      if (type === "invite" || type === "recovery") {
        router.replace(`/auth/update-password?type=${type}${hash}`);
        return;
      }
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center px-4 py-20 bg-white">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">認証を処理しています...</p>
      </div>
    </div>
  );
}
