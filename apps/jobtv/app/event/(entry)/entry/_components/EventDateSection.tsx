"use client";

import EventDateSelector from "./EventDateSelector";
import type { EventForReservation } from "@/lib/actions/event-reservation-actions";
import { cn } from "@jobtv-app/shared/utils/cn";

const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface Props {
  events: EventForReservation[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  webConsultation: boolean;
  onWebConsultationChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function EventDateSection({
  events,
  selectedEventId,
  onSelectEvent,
  webConsultation,
  onWebConsultationChange,
  disabled,
}: Props) {
  return (
    <>
      <EventDateSelector events={events} selectedId={selectedEventId} onSelect={onSelectEvent} disabled={disabled} />

      <div>
        <span className={labelClass}>就活お悩みWEB相談（無料）</span>
        <p className="text-xs text-gray-500 mb-2">無料で弊社専属のキャリアアドバイザーに、就活のお悩みをWEB面談にてご相談いただけます。<br />※別途日程調整フォームが送信されます。</p>
        <div className={cn("flex gap-2", disabled && "opacity-60")}>
          {[
            { value: true, label: "希望する" },
            { value: false, label: "希望しない" },
          ].map((opt) => (
            <label key={String(opt.value)} className={cn("flex flex-1 min-w-0", disabled ? "cursor-default" : "cursor-pointer")}>
              <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                <input
                  type="radio"
                  name="web_consultation_radio"
                  checked={webConsultation === opt.value}
                  onChange={() => onWebConsultationChange(opt.value)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500"
                />
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
