import AccountList from "@/components/AccountList";
import { getTopPageAmbassadors } from "@/lib/actions/top-page-ambassador-actions";

export default async function AccountSectionServer() {
  const result = await getTopPageAmbassadors();
  const accounts = (result.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar_url,
    href: a.link_url ?? undefined,
  }));

  if (accounts.length === 0) return null;
  return <AccountList accounts={accounts} />;
}
