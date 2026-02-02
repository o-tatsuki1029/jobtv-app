import type { CompanyData } from "./types";

interface CompanyOverviewProps {
  company: CompanyData;
}

export default function CompanyOverview({ company }: CompanyOverviewProps) {
  // 会社概要は基本的な情報なので、最低限の情報があれば表示
  // ただし、すべての情報が空の場合は非表示
  const hasOverviewData =
    company.name ||
    company.representative ||
    company.established ||
    company.capital ||
    company.address ||
    company.employees ||
    company.industry ||
    company.website;

  if (!hasOverviewData) return null;

  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        会社概要
      </h2>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden max-w-3xl px-4">
        <dl className="divide-y divide-gray-800">
          {[
            { label: "会社名", value: company.name },
            { label: "代表者", value: company.representative },
            { label: "設立", value: company.established },
            { label: "資本金", value: company.capital },
            { label: "所在地", value: company.address },
            { label: "従業員数", value: company.employees },
            { label: "事業内容", value: company.industry },
            {
              label: "公式サイト",
              value: company.website,
              isLink: true
            }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row p-4 md:p-6 gap-1 md:gap-6">
              <dt className="sm:w-32 flex-shrink-0 text-gray-500 text-xs md:text-sm font-medium">{item.label}</dt>
              <dd className="text-sm md:text-base text-gray-200">
                {item.isLink ? (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {item.value}
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
