import { getAdminDashboardStats } from "@/lib/actions/admin-actions";
import Link from "next/link";
import {
  Building,
  Users,
  Briefcase,
  Calendar,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  MonitorPlay,
  FileImage,
} from "lucide-react";

const REVIEW_LABELS: Record<string, string> = {
  "company-info": "企業情報",
  "company-pages": "企業ページ",
  jobs: "求人",
  sessions: "説明会",
  videos: "動画",
};

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  if (!("reviewCounts" in stats)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
          <p className="text-muted-foreground">エラーが発生しました: {stats.error}</p>
        </div>
      </div>
    );
  }

  const { companies, students, activeJobs, activeSessions, reviewCounts, upcomingEvents } = stats;
  const totalPending = Object.values(reviewCounts).reduce<number>((sum, v) => sum + v, 0);

  const statCards = [
    { label: "登録企業数", value: companies, icon: <Building className="w-5 h-5 text-gray-600" /> },
    { label: "登録学生数", value: students, icon: <Users className="w-5 h-5 text-gray-600" /> },
    { label: "公開求人数", value: activeJobs, icon: <Briefcase className="w-5 h-5 text-gray-600" /> },
    { label: "公開説明会数", value: activeSessions, icon: <Calendar className="w-5 h-5 text-gray-600" /> },
  ];

  const quickAccessItems = [
    { href: "/admin/review", label: "審査管理", icon: <CheckCircle className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
    { href: "/admin/company-accounts", label: "企業アカウント", icon: <Building className="w-5 h-5" />, color: "text-purple-600 bg-purple-50" },
    { href: "/admin/student-accounts", label: "学生アカウント", icon: <Users className="w-5 h-5" />, color: "text-green-600 bg-green-50" },
    { href: "/admin/events", label: "イベント管理", icon: <Calendar className="w-5 h-5" />, color: "text-orange-600 bg-orange-50" },
    { href: "/admin/featured", label: "トップ掲載", icon: <MonitorPlay className="w-5 h-5" />, color: "text-pink-600 bg-pink-50" },
    { href: "/admin/lp-content", label: "LP管理", icon: <FileImage className="w-5 h-5" />, color: "text-indigo-600 bg-indigo-50" },
  ];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
        <p className="text-muted-foreground">プラットフォームの概要</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="p-2 bg-gray-100 rounded-lg w-fit mb-4">
              {card.icon}
            </div>
            <p className="text-gray-500 text-sm font-medium">{card.label}</p>
            <p className="text-2xl font-black mt-1 text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 中段: 審査管理 + 直近イベント */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 審査管理 */}
        <Link href="/admin/review" className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 via-green-500 to-purple-500 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold">審査管理</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold">{totalPending}</span>
              <span className="text-sm text-gray-500">件の審査待ち</span>
            </div>
            <div className="pt-4 border-t border-gray-100 text-sm space-y-2">
              {Object.entries(reviewCounts).map(([key, count]) => (
                <p key={key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {REVIEW_LABELS[key] ?? key}
                  </span>
                  <span className="font-semibold">{count}件</span>
                </p>
              ))}
            </div>
          </div>
        </Link>

        {/* 直近のイベント */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-50">
                  <ClipboardList className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold">直近のイベント</h3>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500">予定されているイベントはありません</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-500 whitespace-nowrap font-medium min-w-[5rem]">
                      {event.event_date}
                    </span>
                    <span className="text-gray-900">
                      {event.display_name || event.event_types?.name || "---"}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-gray-100">
              <Link
                href="/admin/events"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                イベント管理へ
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* クイックアクセス */}
      <div>
        <h2 className="text-lg font-semibold mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccessItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className={`p-3 rounded-lg ${item.color}`}>
                  {item.icon}
                </div>
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
