import { requireStudioAuth } from "@/lib/auth/require-auth";
import { getHeaderAuthInfo } from "@/lib/actions/auth-actions";
import { HeaderAuthProvider } from "@/components/header/HeaderAuthContext";
import StudioLayoutClient from "../layout-client";

export default async function StudioDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudioAuth();

  const result = await getHeaderAuthInfo();
  const initialAuthInfo = result.error || !result.data ? null : result.data;

  return (
    <HeaderAuthProvider initialAuthInfo={initialAuthInfo}>
      <StudioLayoutClient>{children}</StudioLayoutClient>
    </HeaderAuthProvider>
  );
}
