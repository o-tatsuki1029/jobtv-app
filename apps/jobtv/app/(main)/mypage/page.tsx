import { getMypageSummary } from "@/lib/actions/candidate-actions";
import MypageTopView from "@/components/mypage/MypageTopView";

export const metadata = { title: "マイページ | JOBTV" };

export default async function MypagePage({
  searchParams
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const [summaryResult, params] = await Promise.all([
    getMypageSummary(),
    searchParams,
  ]);

  const summary = summaryResult.data;
  const linkedSuccess = params.linked === "1";
  const errorCode = params.error ?? null;

  return (
    <MypageTopView
      fullName={summary?.fullName ?? ""}
      graduationYear={summary?.graduationYear ?? null}
      eventReservationCount={summary?.eventReservationCount ?? 0}
      applicationCount={summary?.applicationCount ?? 0}
      reservationCount={summary?.reservationCount ?? 0}
      lineLinked={summary?.lineLinked ?? false}
      linkedSuccess={linkedSuccess}
      errorCode={errorCode}
    />
  );
}
