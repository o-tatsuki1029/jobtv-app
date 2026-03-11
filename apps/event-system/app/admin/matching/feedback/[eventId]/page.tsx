import { getEventCandidates } from "@/lib/actions/score-sheet-actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function FeedbackListPage({ params }: PageProps) {
  const { eventId } = await params;

  // イベント情報を取得
  const supabase = await createClient();
  const { data: eventData } = await supabase
    .from("events")
    .select("event_date, event_types(name)")
    .eq("id", eventId)
    .single();

  if (!eventData) {
    return notFound();
  }

  const eventName = (eventData.event_types as any)?.name || "イベント";
  const eventDate = eventData.event_date;

  const result = await getEventCandidates(eventId);

  if (!result.success) {
    return (
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
        エラー: {result.error}
      </div>
    );
  }

  const candidates = result.candidates || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            フィードバック一覧
          </h1>
          <p className="text-gray-500">
            {eventName} ({new Date(eventDate).toLocaleDateString("ja-JP")})
          </p>
        </div>
        <Link href="/admin/matching">
          <Button variant="secondary">戻る</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-gray-700">
                席番号
              </th>
              <th className="px-6 py-4 text-sm font-bold text-gray-700">
                学生名
              </th>
              <th className="px-6 py-4 text-sm font-bold text-gray-700">
                フリガナ
              </th>
              <th className="px-6 py-4 text-sm font-bold text-gray-700 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.length > 0 ? (
              candidates.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {c.seatNumber || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.kana}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <Link
                      href={`/admin/matching/feedbacks/${eventId}/${c.id}`}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      詳細レポート
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-gray-500 italic"
                >
                  参加学生が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




