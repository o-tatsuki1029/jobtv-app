import { requireAdmin } from "@/lib/auth/require-auth";
import LineSidebar from "@/components/studio/organisms/LineSidebar";

export default async function AdminLineLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <LineSidebar />
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
