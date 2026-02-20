import { requireRecruiterOrAdmin } from "@/lib/auth/require-auth";
import StudioLayoutClient from "./layout-client";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // recruiterまたはadmin権限をチェック
  await requireRecruiterOrAdmin();

  return <StudioLayoutClient>{children}</StudioLayoutClient>;
}
