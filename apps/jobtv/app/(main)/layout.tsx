import MainLayoutClient from "@/components/main/MainLayoutClient";
import { HeaderAuthProvider } from "@/components/header/HeaderAuthContext";
import { getHeaderAuthInfo } from "@/lib/actions/auth-actions";

export default async function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await getHeaderAuthInfo();
  const initialAuthInfo = result.error || !result.data ? null : result.data;

  return (
    <HeaderAuthProvider initialAuthInfo={initialAuthInfo}>
      <MainLayoutClient>{children}</MainLayoutClient>
    </HeaderAuthProvider>
  );
}
