"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/form/FormField";
import { SelectInput } from "@/components/ui/form/FormField";
import { formatEventDisplay } from "@/utils/data/event";
import type { Event } from "@/types/event.types";
import type { Database } from "@/types";
import Button from "@/components/ui/Button";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import RecruiterGuide from "@/components/recruiter/RecruiterGuide";

type CompanyOption = {
  id: string;
  name: string;
};

type EventSelectionPageClientProps = {
  isAdmin: boolean;
  loggedInRecruiterId?: string;
  loggedInCompanyId?: string;
};

const SELECTED_EVENT_KEY = "recruiter_selected_event_id";

type ExtendedEvent = Event & {
  event_name?: string;
  target_graduation_year?: number | null;
  area?: string | null;
};

function EventSelectionPageClient({
  isAdmin,
  loggedInRecruiterId,
  loggedInCompanyId,
}: EventSelectionPageClientProps) {
  const [events, setEvents] = useState<ExtendedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useSessionStorage<string>(
    SELECTED_EVENT_KEY,
    ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [isLoggedIn] = useState(
    !!(loggedInRecruiterId && loggedInCompanyId) || isAdmin
  );
  const [profile, setProfile] = useState<{
    company_name: string;
    recruiter_name: string;
  } | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!loggedInRecruiterId || !loggedInCompanyId) return;
    try {
      const supabase = createClient();
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("last_name, first_name, companies(name)")
        .eq("id", loggedInRecruiterId)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          recruiter_name: `${profileData.last_name} ${profileData.first_name}`,
          company_name: (profileData.companies as any)?.name || "",
        });
      }
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
    }
  }, [loggedInRecruiterId, loggedInCompanyId]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      let query = supabase.from("events").select(`
        *,
        event_types (
          name,
          target_graduation_year,
          area
        )
      `);

      // 管理者でない場合は、自分の企業が参加しているイベントのみに絞り込む
      if (!isAdmin && loggedInCompanyId) {
        // event_companiesを経由してイベントIDを取得
        const { data: ecData, error: ecError } = await supabase
          .from("event_companies")
          .select("event_id")
          .eq("company_id", loggedInCompanyId);

        if (ecError) throw ecError;
        const eventIds = (ecData || []).map((item) => item.event_id);

        if (eventIds.length === 0) {
          setEvents([]);
          setIsLoading(false);
          return;
        }

        query = query.in("id", eventIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("イベント取得エラー:", error);
        return;
      }

      // データを整形
      const formattedEvents: ExtendedEvent[] = (data || [])
        .map((event: any) => {
          const eventType = event.event_types;
          return {
            ...event,
            event_name: eventType?.name || "",
            target_graduation_year: eventType?.target_graduation_year || null,
            area: eventType?.area || null,
          } as ExtendedEvent;
        })
        .sort((a, b) => {
          if (!a?.event_date || !b?.event_date) return 0;
          const dateA = new Date(a.event_date).getTime();
          const dateB = new Date(b.event_date).getTime();
          return dateB - dateA;
        });

      setEvents(formattedEvents);
    } catch (error) {
      console.error("予期しないエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, loggedInCompanyId]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchEvents();
      if (!isAdmin) {
        fetchProfile();
      }
    }
  }, [isLoggedIn, fetchEvents, fetchProfile, isAdmin]);

  const handleSave = () => {
    if (!selectedEventId) {
      setSaveMessage("イベントを選択してください");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      // useSessionStorageフックが自動的にセッションストレージに保存する
      setSelectedEventId(selectedEventId);
      setSaveMessage("イベントを保存しました");
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const eventOptions = events.map((event) => ({
    value: event.id,
    label: formatEventDisplay(event),
  }));

  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId)
    : null;

  if (!isLoggedIn) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">HOME</h2>
        <p className="text-gray-600">ログインしてください。</p>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 text-xs text-gray-500">
            <p>Debug: isAdmin={String(isAdmin)}</p>
            <p>
              Debug: loggedInRecruiterId={loggedInRecruiterId || "undefined"}
            </p>
            <p>Debug: loggedInCompanyId={loggedInCompanyId || "undefined"}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">HOME</h2>
        {isAdmin && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
            管理者プレビュー
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* 1. ログイン情報 */}
        {profile && (
          <div className="p-4 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                ログイン情報
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-8 gap-3">
              <div>
                <span className="text-[10px] text-blue-700 font-bold block mb-0.5 uppercase tracking-wider">
                  企業名
                </span>
                <span className="text-base font-bold text-blue-900 tracking-tight">
                  {profile.company_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-blue-700 font-bold block mb-0.5 uppercase tracking-wider">
                  担当者名
                </span>
                <span className="text-base font-bold text-blue-900 tracking-tight">
                  {profile.recruiter_name} 様
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* 使い方説明 */}
          <RecruiterGuide
            title="マッチングシステムのご利用方法"
            defaultOpen={true}
            items={[
              "最初に、下記ドロップダウンから参加イベントを選択してください。",
              "「保存」ボタンを押すと、選択したイベントの情報が各メニューで表示されるようになります。",
              "サイドバーの「学生評価」メニューから評価を開始できます。",
              "「学生からの評価」メニューから評価レートごとの集計を確認できます。(ベータ機能)",
              "「テンプレート」メニューから学生へのコメントテンプレートを作成・編集可能です。",
            ]}
          />

          {/* 2. イベント選択 */}
          {isAdmin ? (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg space-y-4">
              <div className="text-xs font-bold text-red-600 mb-1">
                管理者プレビューモード
              </div>
              <FormField label="イベント選択">
                <SelectInput
                  name="event"
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setSaveMessage("");
                  }}
                  options={eventOptions}
                  placeholder="イベントを選択"
                  disabled={isLoading}
                />
              </FormField>
            </div>
          ) : (
            <FormField label="イベント選択">
              <SelectInput
                name="event"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setSaveMessage("");
                }}
                options={eventOptions}
                placeholder="イベントを選択"
                disabled={isLoading}
              />
            </FormField>
          )}

          {/* 3. イベント（詳細） */}
          {selectedEvent && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                選択中のイベント
              </div>
              <div className="text-base text-gray-900 font-medium">
                {formatEventDisplay(selectedEvent)}
              </div>
            </div>
          )}

          {/* 4. 保存 */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !selectedEventId || isLoading}
              size="md"
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
            {saveMessage && (
              <span
                className={`text-sm font-medium ${
                  saveMessage.includes("失敗")
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventSelectionPageClient;
