import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/constants/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: ROBOTS_NOINDEX
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-gray-600">お探しのページは見つかりませんでした。</p>
      <Link href="/" className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
        トップページへ戻る
      </Link>
    </div>
  );
}
