import { getMyApplications } from "@/lib/actions/candidate-actions";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import EntriesView from "@/components/mypage/EntriesView";
import LineConnectionRequired from "@/components/mypage/LineConnectionRequired";

export const metadata = { title: "エントリー中の企業 | マイページ | JOBTV" };

export default async function EntriesPage() {
  const lineResult = await getLineLinkStatus();
  const lineLinked = lineResult.data?.linked ?? false;

  if (!lineLinked) {
    return <LineConnectionRequired title="エントリー中の企業" />;
  }

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
