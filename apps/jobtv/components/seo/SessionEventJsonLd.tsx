import { SITE_URL } from "@/constants/site";

interface SessionDateRow {
  event_date: string;
  start_time: string | null;
  end_time: string | null;
}

interface SessionEventJsonLdProps {
  session: {
    id: string;
    title: string;
    description: string;
    location_type: string | null;
    location_detail: string | null;
    capacity: number | null;
    status?: string | null;
  };
  company: { name: string };
  /** 最初の開催日（startDate/endDate に使用、省略可） */
  firstDate?: SessionDateRow | null;
}

/** location_type を Schema.org の eventAttendanceMode URL に変換 */
function toAttendanceMode(locationType: string | null): string {
  if (!locationType) return "https://schema.org/OfflineEventAttendanceMode";
  if (locationType === "オンライン") return "https://schema.org/OnlineEventAttendanceMode";
  if (locationType === "対面/オンライン") return "https://schema.org/MixedEventAttendanceMode";
  return "https://schema.org/OfflineEventAttendanceMode";
}

/** location_type に応じた location オブジェクトを生成 */
function toLocation(locationType: string | null, locationDetail: string | null) {
  const isOnline = locationType === "オンライン";
  const isMixed = locationType === "対面/オンライン";
  const name = [locationType, locationDetail].filter(Boolean).join(" / ") || undefined;

  if (isOnline) {
    return { "@type": "VirtualLocation", name: locationDetail || "オンライン" };
  }
  if (isMixed) {
    return [
      { "@type": "VirtualLocation", name: "オンライン" },
      ...(locationDetail ? [{ "@type": "Place", name: locationDetail }] : [])
    ];
  }
  if (name) {
    return { "@type": "Place", name };
  }
  return undefined;
}

/**
 * 説明会詳細ページ用の Event 構造化データ（Schema.org）
 */
export default function SessionEventJsonLd({
  session,
  company,
  firstDate
}: SessionEventJsonLdProps) {
  const url = `${SITE_URL}/session/${session.id}`;

  let startDate: string | undefined;
  let endDate: string | undefined;
  if (firstDate?.event_date) {
    const datePart = firstDate.event_date;
    const start = firstDate.start_time ? firstDate.start_time.slice(0, 8) : "00:00:00";
    const end = firstDate.end_time ? firstDate.end_time.slice(0, 8) : "23:59:59";
    startDate = `${datePart}T${start}`;
    endDate = `${datePart}T${end}`;
  }

  const eventStatus =
    session.status === "active" ? "https://schema.org/EventScheduled" : "https://schema.org/EventCancelled";

  const location = toLocation(session.location_type, session.location_detail);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: session.title,
    description: session.description || undefined,
    url,
    eventStatus,
    eventAttendanceMode: toAttendanceMode(session.location_type),
    organizer: {
      "@type": "Organization",
      name: company.name
    },
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(session.capacity != null && { maximumAttendeeCapacity: session.capacity }),
    ...(location && { location })
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
