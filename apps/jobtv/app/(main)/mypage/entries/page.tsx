import { getMyApplications } from "@/lib/actions/candidate-actions";
import EntriesView from "@/components/mypage/EntriesView";

export const metadata = { title: "エントリー中の企業 | マイページ | JOBTV" };

export default async function EntriesPage() {
  const { data, error } = await getMyApplications();

  type AppRow = {
    id: string;
    current_status: string;
    created_at: string;
    job_postings: {
      id: string;
      title: string;
      graduation_year: number | null;
      companies: { id: string; name: string; logo_url: string | null } | null;
    } | null;
  };

  return <EntriesView data={data as AppRow[] | null} error={error} />;
}
