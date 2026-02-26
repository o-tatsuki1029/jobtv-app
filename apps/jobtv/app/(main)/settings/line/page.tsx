import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRedirectPathByRole } from "@/lib/auth/redirect";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import { LineLinkClient } from "./LineLinkClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LINE連携",
  description: "LINEアカウントを連携して、お知らせを受け取れます。"
};

/**
 * 学生（candidate）のみアクセス可能。未ログイン・他ロールはリダイレクト。
 */
export default async function SettingsLinePage({
  searchParams
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "candidate") {
    redirect(getRedirectPathByRole(profile?.role ?? null));
  }

  const statusResult = await getLineLinkStatus();
  const linked = statusResult.data?.linked ?? false;
  const statusError = statusResult.error ?? null;

  const params = await searchParams;
  const linkedSuccess = params.linked === "1";
  const errorCode = params.error ?? null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold mb-2">LINE連携</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        LINEと連携すると、お知らせをLINEで受け取れます。
      </p>

      {linkedSuccess && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          LINEと連携しました。
        </div>
      )}
      {errorCode && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorCode === "already_linked"
            ? "このLINEアカウントは別のアカウントで連携済みです。"
            : errorCode === "invalid_state" || errorCode === "invalid_callback"
              ? "連携に失敗しました。もう一度お試しください。"
              : errorCode === "not_logged_in"
                ? "ログインし直して再度お試しください。"
                : errorCode === "line_failed" || errorCode === "update_failed"
                  ? "LINE認証または保存に失敗しました。しばらく経ってからお試しください。"
                  : "連携中にエラーが発生しました。"}
        </div>
      )}

      {statusError && (
        <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {statusError}
        </div>
      )}

      {!statusError && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {linked ? (
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">連携済み</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                このアカウントはLINEと連携されています。お知らせをLINEで受け取れます。
              </p>
              <LineLinkClient />
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">未連携</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                LINEと連携すると、採用お知らせなどをLINEで受け取れます。
              </p>
              <Link
                href="/api/line/authorize"
                className="inline-flex items-center justify-center rounded-md bg-[#06C755] px-4 py-2 text-sm font-medium text-white hover:bg-[#05b34a]"
              >
                LINEと連携する
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="underline hover:no-underline">
          トップへ戻る
        </Link>
      </p>
    </div>
  );
}
