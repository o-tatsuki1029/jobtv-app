"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAvailableSessionDates, type SessionDate } from "@/lib/actions/session-entry-actions";
import { createSessionReservation } from "@/lib/actions/session-reservation-actions";
import { EventSelection } from "@/components/session/EventSelection";
import { EventEntryForm, type EventEntryFormData } from "@/components/session/EventEntryForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SessionEntryContent() {
  const searchParams = useSearchParams();
  const urlSessionDateId = searchParams.get("sessionDateId") || "";
  const [selectedSessionDateId, setSelectedSessionDateId] = useState(urlSessionDateId);

  const [sessionDates, setSessionDates] = useState<SessionDate[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [formData, setFormData] = useState<EventEntryFormData>({
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    phone: "",
    email: "",
    school_name: "",
    gender: "",
    graduation_year: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 説明会日程一覧を取得
  useEffect(() => {
    async function fetchSessionDates() {
      setIsLoadingSessions(true);
      const data = await getAvailableSessionDates();
      setSessionDates(data);
      setIsLoadingSessions(false);
    }
    fetchSessionDates();
  }, []);

  // URLパラメータの変更を監視
  useEffect(() => {
    if (urlSessionDateId) {
      setSelectedSessionDateId(urlSessionDateId);
    }
  }, [urlSessionDateId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSessionDateId) {
      setError("日程を選択してください");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await createSessionReservation(selectedSessionDateId, {
        last_name: formData.last_name,
        first_name: formData.first_name,
        last_name_kana: formData.last_name_kana,
        first_name_kana: formData.first_name_kana,
        phone: formData.phone,
        email: formData.email,
        school_name: formData.school_name || undefined,
        gender: formData.gender || undefined,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : undefined
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予約の作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">予約が完了しました</h1>
          <p className="text-gray-600 mb-8">ご予約ありがとうございます</p>
          <Link href="/" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center px-4 py-8 sm:py-20 bg-white">
      <div className="max-w-200 w-full">
        {/* 全体を包むカードスタイル */}
        <div className="bg-white sm:p-8 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-xl">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">説明会予約</h1>
            <p className="text-sm sm:text-base text-gray-600">内容を確認して予約を確定してください</p>
          </div>

          <EventSelection
            events={sessionDates.map((sd) => ({
              id: sd.id,
              event_date: sd.event_date,
              start_time: sd.start_time,
              end_time: sd.end_time,
              master_event_types: {
                name: sd.session?.title || "",
                area: sd.session?.location_detail || ""
              }
            }))}
            isLoading={isLoadingSessions}
            selectedEventId={selectedSessionDateId}
            onSelect={setSelectedSessionDateId}
          />

          <EventEntryForm
            formData={formData}
            setFormData={setFormData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            setError={setError}
            selectedEventId={selectedSessionDateId}
          />
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          <Link href="/" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
            トップページに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SessionEntryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <SessionEntryContent />
    </Suspense>
  );
}
