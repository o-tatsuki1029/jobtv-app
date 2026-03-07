import { getMyCandidateProfile } from "@/lib/actions/candidate-actions";
import ProfileEditForm from "@/components/mypage/ProfileEditForm";

export const metadata = { title: "プロフィール編集 | マイページ | JOBTV" };

export default async function ProfilePage() {
  const { data, error } = await getMyCandidateProfile();
  return <ProfileEditForm initialData={data} error={error ?? undefined} />;
}
