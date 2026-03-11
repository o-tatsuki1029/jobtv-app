import Link from "next/link";
import { Suspense } from "react";
import Button from "@/components/ui/Button";
import { cookies } from "next/headers";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";
import { ROLE_LABELS } from "@jobtv-app/shared/auth";
import { redirect } from "next/navigation";

async function CandidateLogoutForm() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete("candidate_id");
  cookieStore.delete("candidate_event_id");
  redirect("/candidate/login");
}

async function CandidateHeaderInner() {
  const cookieStore = await cookies();
  const candidateId = cookieStore.get("candidate_id")?.value;

  let email = "";
  let name = "";

  if (candidateId) {
    try {
      const supabase = getAdminClient();
      const { data: candidate, error } = await supabase
        .from("candidates")
        .select("profiles!profiles_candidate_id_fkey(email, last_name, first_name)")
        .eq("id", candidateId)
        .single();

      if (error) {
        console.error("Failed to fetch candidate info:", error);
      } else if (candidate) {
        const c = candidate as { profiles: { email: string | null; last_name: string | null; first_name: string | null } | { email: string | null; last_name: string | null; first_name: string | null }[] | null };
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        email = profile?.email ?? "";
        name = profile?.last_name && profile?.first_name
          ? `${profile.last_name} ${profile.first_name}`
          : profile?.last_name || profile?.first_name || ROLE_LABELS.candidate;
      }
    } catch (error) {
      console.error("Error fetching candidate info:", error);
    }
  }


  return (
    <div className="flex h-16 items-center justify-between px-6 bg-gray-900 text-white">
      <div className="flex items-center gap-6">
        <Link href="/candidate/rating" className="flex items-center gap-2 font-semibold">
          <span>イベント運営システム</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {name && <span className="text-sm text-gray-300">{name}</span>}
        {email && <span className="text-sm text-gray-300 hidden md:inline">{email}</span>}
        <form action={CandidateLogoutForm}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="bg-gray-600 hover:bg-gray-500 text-white"
          >
            ログアウト
          </Button>
        </form>
      </div>
    </div>
  );
}

function CandidateHeaderContent() {
  return (
    <Suspense
      fallback={
        <div className="flex h-16 items-center justify-between px-6 bg-gray-900 text-white">
          <div className="flex items-center gap-6">
            <Link href="/candidate/rating" className="flex items-center gap-2 font-semibold">
              <span>イベント運営システム</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">読み込み中...</span>
          </div>
        </div>
      }
    >
      <CandidateHeaderInner />
    </Suspense>
  );
}

export { CandidateHeaderContent };

