import { getSession } from "@/lib/actions/session-actions";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { approveSession, rejectSession } from "@/lib/actions/admin-actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";

type Session = Tables<"sessions">;

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getSessionWithCompany(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      companies (
        id,
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Get session with company error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

async function getSessionDates(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_dates")
    .select("*")
    .eq("session_id", sessionId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Get session dates error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

export default async function AdminSessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = await params;
  const { data: session, error } = await getSessionWithCompany(id);

  if (error || !session) {
    redirect("/admin/sessions");
  }

  const sessionData = session as Session & {
    companies?: {
      id: string;
      name: string;
    } | null;
  };

  const { data: dates } = await getSessionDates(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/sessions">
            <StudioButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </StudioButton>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{sessionData.title}</h1>
            <p className="text-muted-foreground">説明会情報の審査</p>
          </div>
        </div>
        {sessionData.status === "pending" && (
          <ApprovalActions
            onApprove={() => approveSession(id)}
            onReject={() => rejectSession(id)}
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <StudioBadge variant={sessionData.status === "pending" ? "neutral" : "success"}>
              {sessionData.status === "pending" ? "審査中" : sessionData.status === "active" ? "公開中" : "終了"}
            </StudioBadge>
            {sessionData.companies && (
              <span className="text-sm text-gray-600 font-medium">企業: {sessionData.companies.name}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">種類</p>
            <p className="text-base">{sessionData.type || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">場所タイプ</p>
            <p className="text-base">{sessionData.location_type || "未設定"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">場所詳細</p>
            <p className="text-base">{sessionData.location_detail || "未設定"}</p>
          </div>
          {sessionData.capacity && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">定員</p>
              <p className="text-base">{sessionData.capacity}名</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">詳細説明</p>
          <p className="text-base whitespace-pre-wrap">{sessionData.description || "未設定"}</p>
        </div>

        {dates && dates.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">開催日程</p>
            <div className="space-y-2">
              {dates.map((date: any) => (
                <div key={date.id} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">
                    {new Date(date.event_date).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}{" "}
                    {date.start_time} 〜 {date.end_time}
                  </p>
                  {date.capacity && (
                    <p className="text-xs text-gray-500 mt-1">定員: {date.capacity}名</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">作成日</p>
            <p className="text-base">
              {new Date(sessionData.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">更新日</p>
            <p className="text-base">
              {new Date(sessionData.updated_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

