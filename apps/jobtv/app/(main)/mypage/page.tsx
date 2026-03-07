import { getMyCandidateProfile, getMyApplications, getMyReservations } from "@/lib/actions/candidate-actions";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import MypageTopView from "@/components/mypage/MypageTopView";

export const metadata = { title: "マイページ | JOBTV" };

export default async function MypagePage() {
  const [profileResult, applicationsResult, reservationsResult, lineLinkResult] = await Promise.all([
    getMyCandidateProfile(),
    getMyApplications(),
    getMyReservations(),
    getLineLinkStatus()
  ]);

  const profile = profileResult.data;
  const fullName = profile ? `${profile.last_name} ${profile.first_name}` : "";
  const applicationCount = (applicationsResult.data ?? []).length;
  const reservationCount = (reservationsResult.data ?? []).filter(
    (r: { status: string }) => r.status === "reserved"
  ).length;

  const lineLinked = lineLinkResult.data?.linked ?? false;

  return (
    <MypageTopView
      fullName={fullName}
      graduationYear={profile?.graduation_year ?? null}
      applicationCount={applicationCount}
      reservationCount={reservationCount}
      lineLinked={lineLinked}
    />
  );
}
