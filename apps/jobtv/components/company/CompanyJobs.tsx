import Link from "next/link";
import Image from "next/image";
import type { CompanyData } from "./types";

interface CompanyJobsProps {
  company: CompanyData;
}

export default function CompanyJobs({ company }: CompanyJobsProps) {
  if (!company.jobs || company.jobs.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        募集中の求人
      </h2>
      <div className="space-y-3 md:space-y-4">
        {company.jobs.map((job) => (
          <Link
            key={job.id}
            href={`/job/${job.id}`}
            className="block bg-gray-800/50 hover:bg-gray-800/60 rounded-lg transition-all overflow-hidden group"
          >
            {job.coverImage && (
              <div className="relative w-full h-32 md:h-40 overflow-hidden">
                <Image
                  src={job.coverImage}
                  alt={job.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent" />
              </div>
            )}
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                    <span className="px-2 py-0.5 bg-red-600/10 text-red-500 text-[10px] md:text-xs font-bold rounded border border-red-600/20 w-fit">
                      {job.graduationYear || "2028年卒"}
                    </span>
                    <h3 className="text-base md:text-lg font-bold group-hover:text-red-500 transition-colors">
                      {job.title}
                    </h3>
                  </div>
                  {job.location && (
                    <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-2 text-xs md:text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
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
                        {job.location}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden md:flex items-center text-red-500 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  詳細を見る
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
