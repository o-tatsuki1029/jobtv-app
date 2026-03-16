import { getMyReservations } from "@/lib/actions/candidate-actions";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import ReservationsView from "@/components/mypage/ReservationsView";
import LineConnectionRequired from "@/components/mypage/LineConnectionRequired";

export const metadata = { title: "説明会・インターン予約一覧 | マイページ | JOBTV" };

export default async function ReservationsPage() {
  const lineResult = await getLineLinkStatus();
  const lineLinked = lineResult.data?.linked ?? false;

  if (!lineLinked) {
    return <LineConnectionRequired title="説明会・インターン予約一覧" />;
  }

  const { data, error } = await getMyReservations();

  type ResRow = {
    id: string;
    status: string;
    attended: boolean;
    created_at: string;
    session_dates: {
      id: string;
      event_date: string;
      start_time: string;
      end_time: string;
      sessions: {
        id: string;
        title: string;
        companies: { id: string; name: string } | null;
      } | null;
    } | null;
  };

  return <ReservationsView data={data as ResRow[] | null} error={error} />;
}
