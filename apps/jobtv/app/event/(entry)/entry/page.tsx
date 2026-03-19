import { getPublicEventsForReservation } from "@/lib/actions/event-reservation-actions";
import { getHeaderAuthInfo } from "@/lib/actions/auth-actions";
import EventEntryForm from "./_components/EventEntryForm";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventEntryNewPage({ searchParams }: Props) {
  const sp = await searchParams;

  // URL パラメータからフィルタ条件を抽出
  const eventTypeIdsParam = sp.event_type_ids;
  const eventTypeIds = eventTypeIdsParam
    ? (Array.isArray(eventTypeIdsParam) ? eventTypeIdsParam : eventTypeIdsParam.split(","))
    : undefined;

  const fromDays = sp.from_days ? Number(sp.from_days) : 1;
  const toDays = sp.to_days ? Number(sp.to_days) : 30;

  // データ取得
  const [eventsResult, authResult] = await Promise.all([
    getPublicEventsForReservation({ eventTypeIds, fromDays, toDays }),
    getHeaderAuthInfo(),
  ]);

  const events = eventsResult.data ?? [];

  // ログイン済み candidate かどうか判定
  // getHeaderAuthInfo は recruiter/admin のみ role を返す。candidate は role=null, user!=null
  const authData = authResult.error ? null : authResult.data;
  const isLoggedIn = !!authData?.user;
  const isStudioUser = authData?.role === "recruiter" || authData?.role === "admin";
  const isLoggedInCandidate = isLoggedIn && !isStudioUser;

  return (
    <div className="flex items-center justify-center px-2 py-8 sm:px-4 bg-white">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">イベント予約</h1>
          <p className="text-gray-600 text-xs">参加するイベント日程を選択してください</p>
        </div>
        <EventEntryForm events={events} isLoggedInCandidate={isLoggedInCandidate} loggedInEmail={isLoggedInCandidate ? (authData?.user?.email ?? null) : null} />
      </div>
    </div>
  );
}
