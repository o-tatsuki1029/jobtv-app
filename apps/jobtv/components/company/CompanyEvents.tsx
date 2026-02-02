import Link from "next/link";
import type { CompanyData } from "./types";

interface CompanyEventsProps {
  company: CompanyData;
}

export default function CompanyEvents({ company }: CompanyEventsProps) {
  if (!company.events || company.events.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
          説明会・インターンシップ
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {company.events.map((event) => (
          <Link
            key={event.id}
            href={`/session/${event.id}`}
            className="group bg-gray-800/50 hover:bg-gray-800/60 rounded-lg transition-all overflow-hidden flex flex-col"
          >
            <div className="p-4 md:p-5 flex-1">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <span className="px-2 py-0.5 bg-blue-600/10 text-blue-400 text-[10px] font-bold rounded border border-blue-600/20 uppercase tracking-wider">
                  {event.type}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                    event.status === "受付中"
                      ? "bg-green-600/10 text-green-400 border-green-600/20"
                      : "bg-orange-600/10 text-orange-400 border-orange-600/20"
                  }`}
                >
                  {event.status}
                </span>
              </div>
              <h3 className="text-sm md:text-base font-bold mb-3 md:mb-4 group-hover:text-red-500 transition-colors line-clamp-2">
                {event.title}
              </h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.location}
                </div>
              </div>
            </div>
            <div className="px-5 py-2.5 md:py-3 bg-gray-800/80 border-t border-gray-700/50 text-[10px] md:text-xs font-bold text-center group-hover:bg-red-600 group-hover:text-white transition-all">
              説明会詳細・予約
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
