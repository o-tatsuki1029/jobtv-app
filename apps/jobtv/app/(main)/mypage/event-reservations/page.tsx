import { getMyEventReservations } from "@/lib/actions/candidate-actions";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import EventReservationsView from "@/components/mypage/EventReservationsView";
import LineConnectionRequired from "@/components/mypage/LineConnectionRequired";

export const metadata = { title: "イベント予約一覧 | マイページ | JOBTV" };

export default async function EventReservationsPage() {
  const lineResult = await getLineLinkStatus();
  const lineLinked = lineResult.data?.linked ?? false;

  if (!lineLinked) {
    return <LineConnectionRequired title="イベント予約一覧" />;
  }

  const { data, error } = await getMyEventReservations();

  type EventResRow = {
    id: string;
    status: string;
    web_consultation: boolean;
    created_at: string;
    events: {
      event_date: string;
      start_time: string;
      end_time: string;
      venue_name: string | null;
      display_name: string | null;
      gathering_time: string | null;
      venue_address: string | null;
      google_maps_url: string | null;
      status: string | null;
      event_types: {
        id: string;
        name: string;
        area: string | null;
      } | null;
    } | null;
  };

  return <EventReservationsView data={data as EventResRow[] | null} error={error} />;
}
