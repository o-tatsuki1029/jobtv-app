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
  };
  company: { name: string };
  /** 最初の開催日（startDate/endDate に使用、省略可） */
  firstDate?: SessionDateRow | null;
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

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: session.title,
    description: session.description || undefined,
    url,
    organizer: {
      "@type": "Organization",
      name: company.name
    },
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(session.capacity != null && { maximumAttendeeCapacity: session.capacity }),
    location:
      session.location_type || session.location_detail
        ? {
            "@type": "Place",
            name: [session.location_type, session.location_detail].filter(Boolean).join(" / ")
          }
        : undefined
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
