import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/constants/site";

/** 管理者向け管理画面は検索エンジンにインデックスさせない */
export const metadata: Metadata = {
  robots: ROBOTS_NOINDEX
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
