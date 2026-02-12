import { getReviewSummary } from "@/lib/actions/admin-actions";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

export default async function AdminDashboardPage() {
  const summary = await getReviewSummary();

  if (summary.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
          <p className="text-muted-foreground">エラーが発生しました: {summary.error}</p>
        </div>
      </div>
    );
  }

  const totalPending = summary.pendingJobs + summary.pendingSessions + summary.pendingCompanies;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
        <p className="text-muted-foreground">審査待ちの項目を管理します</p>
      </div>

      <Link href="/admin/review">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-blue-500 via-green-500 to-purple-500 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">審査管理</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalPending}</span>
            <span className="text-sm text-gray-500">件の審査待ち</span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              企業: {summary.pendingCompanies}件
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              求人: {summary.pendingJobs}件
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              説明会: {summary.pendingSessions}件
            </p>
          </div>
        </div>
      </Link>

      {totalPending === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-lg text-gray-500">審査待ちの項目はありません</p>
        </div>
      )}
    </div>
  );
}

