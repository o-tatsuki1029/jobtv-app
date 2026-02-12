import { getSessions } from "@/lib/actions/session-actions";
import { SessionsList } from "@/components/sessions-list";

export async function SessionsListContent() {
  const { data: sessions, error } = await getSessions();

  if (error) {
    console.error("Error fetching sessions:", error);
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">
          エラーが発生しました: {error}
        </p>
      </div>
    );
  }

  return <SessionsList sessions={sessions || []} />;
}

