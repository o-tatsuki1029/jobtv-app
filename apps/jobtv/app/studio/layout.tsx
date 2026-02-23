import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/constants/site";

/** スタジオ（企業向け管理画面）は検索エンジンにインデックスさせない */
export const metadata: Metadata = {
  robots: ROBOTS_NOINDEX
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
