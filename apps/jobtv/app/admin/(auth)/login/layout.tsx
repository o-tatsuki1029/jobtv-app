export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証チェックをバイパス（ログインページなので）
  return <>{children}</>;
}


