import {
  getMatchingResults,
  getAllMatchingSessions,
} from "@/lib/actions/matching-actions";
import { createClient } from "@/lib/supabase/server";
import MatchingResultsClient from "@/components/admin/matching/MatchingResultsClient";

type MatchingResultsPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function MatchingResultsPage({
  params,
}: MatchingResultsPageProps) {
  // 認証チェックはレイアウトで実施
  const { sessionId } = await params;
  const result = await getMatchingResults(sessionId);

  if (!result.success) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">マッチング結果</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          結果の取得に失敗しました: {result.error}
        </div>
      </div>
    );
  }

  // セッションIDからイベントIDと詳細情報を取得
  const supabase = await createClient();
  const { data: sessionData } = await supabase
    .from("event_matching_sessions")
    .select(
      "event_id, events(event_date, start_time, master_event_types(name))"
    )
    .eq("id", sessionId)
    .single();

  const eventData = sessionData?.events as any;
  const eventDate = eventData?.event_date || "";
  const startTime = eventData?.start_time || "";
  const eventName = eventData?.master_event_types?.name || "";

  let allSessions: Array<{
    id: string;
    created_at: string;
    session_count: number;
    company_weight: number;
    candidate_weight: number;
  }> = [];
  if (sessionData?.event_id) {
    const sessionsResult = await getAllMatchingSessions(sessionData.event_id);
    if (sessionsResult.success) {
      allSessions = sessionsResult.sessions || [];
    }
  }

  return (
    <MatchingResultsClient
      results={result.results || []}
      sessionId={sessionId}
      allSessions={allSessions}
      eventId={sessionData?.event_id || ""}
      eventDate={eventDate}
      startTime={startTime}
      eventName={eventName}
    />
  );
}
