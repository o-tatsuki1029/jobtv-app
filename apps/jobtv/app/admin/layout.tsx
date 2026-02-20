import { requireAdmin } from "@/lib/auth/require-auth";
import StudioPageLayout from "@/components/studio/templates/StudioPageLayout";
import AdminSidebar from "@/components/studio/organisms/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 管理者権限をチェック
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* 管理者用サイドバー */}
      <AdminSidebar />

      {/* メインコンテンツ */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

