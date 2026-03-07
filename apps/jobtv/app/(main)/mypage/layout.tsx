import { requireCandidate } from "@/lib/auth/require-auth";
import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/constants/site";

export const metadata: Metadata = {
  robots: ROBOTS_NOINDEX
};

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  await requireCandidate();
  return <>{children}</>;
}
