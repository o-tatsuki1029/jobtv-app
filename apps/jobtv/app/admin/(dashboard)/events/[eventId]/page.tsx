"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import Tabs from "@/components/studio/molecules/Tabs";
import { getEventById, deleteEvent } from "@/lib/actions/event-admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

import EventInfoTab from "./_components/EventInfoTab";
import EventCompaniesTab from "./_components/EventCompaniesTab";
import EventReservationsTab from "./_components/EventReservationsTab";

type EventType = Tables<"event_types">;
type EventWithType = Tables<"events"> & { event_types: EventType | null };

const TABS = [
  { id: "info", label: "イベント情報", color: "black" as const },
  { id: "companies", label: "参加企業", color: "black" as const },
  { id: "reservations", label: "予約一覧", color: "black" as const },
];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventWithType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await getEventById(eventId);
      if (result.data) {
        setEvent(result.data);
      }
      setLoading(false);
    };
    load();
  }, [eventId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await deleteEvent(eventId);
    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
    } else {
      router.push("/admin/events");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <StudioButton
          variant="outline"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/admin/events")}
        >
          一覧に戻る
        </StudioButton>
        <p className="text-gray-500">イベントが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudioButton
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/admin/events")}
          >
            一覧に戻る
          </StudioButton>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {event.event_types?.name || "イベント"} - {event.event_date}
            </h1>
            <p className="text-sm text-gray-500">
              {event.start_time} 〜 {event.end_time}
              {event.event_types?.area ? ` / ${event.event_types.area}` : ""}
              {event.event_types?.target_graduation_year ? ` / ${event.event_types.target_graduation_year}年卒` : ""}
            </p>
          </div>
        </div>
        <StudioButton
          variant="outline"
          size="sm"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => setShowDeleteConfirm(true)}
        >
          削除
        </StudioButton>
      </div>

      {/* タブ */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* タブコンテンツ */}
      <div>
        {activeTab === "info" && (
          <EventInfoTab event={event} onEventUpdate={(e) => setEvent(e)} />
        )}
        {activeTab === "companies" && (
          <EventCompaniesTab eventId={eventId} />
        )}
        {activeTab === "reservations" && (
          <EventReservationsTab eventId={eventId} />
        )}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">イベントを削除しますか？</h2>
              <p className="text-sm text-gray-600 mb-6">イベントは論理削除され、一覧には表示されなくなります。予約データは保持されます。</p>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-bold text-red-800">{deleteError}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <StudioButton variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  キャンセル
                </StudioButton>
                <StudioButton variant="primary" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "削除中..." : "削除"}
                </StudioButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
