"use client";

import type { EventForReservation } from "@/lib/actions/event-reservation-actions";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Props {
  events: EventForReservation[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}月 ${day}日 (${weekday})`;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function EventDateSelector({ events, selectedId, onSelect, disabled }: Props) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        現在予約可能なイベントはありません
      </div>
    );
  }

  return (
    <div className="max-h-[240px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
      {events.map((event) => {
        const isSelected = selectedId === event.id;
        return (
          <label
            key={event.id}
            className={cn(
              "flex items-center gap-3 px-5 py-3 transition-colors",
              disabled ? "cursor-default opacity-60" : "cursor-pointer",
              isSelected ? "bg-red-50/60" : disabled ? "bg-white" : "bg-white hover:bg-gray-50"
            )}
          >
            <input
              type="radio"
              name="event_id"
              value={event.id}
              checked={isSelected}
              onChange={() => onSelect(event.id)}
              disabled={disabled}
              className="h-4 w-4 shrink-0 border-2 border-gray-300 text-red-500 accent-red-500"
            />
            <div className="flex-1 min-w-0">
              {(event.form_label || event.event_types?.name) && (
                <span className="inline-block mb-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {event.form_label || event.event_types?.name}
                </span>
              )}
              <div className="text-sm text-gray-900">
                {formatDate(event.event_date)}{" "}
                {formatTime(event.start_time)} 〜 {formatTime(event.end_time)}
              </div>
              {(event.venue_name || event.form_area || event.event_types?.area) && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.venue_name || event.form_area || event.event_types?.area}
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
