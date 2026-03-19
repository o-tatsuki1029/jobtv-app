"use client";

import { useState, useCallback, useTransition } from "react";
import CompanySection from "@/components/CompanySection";
import { getCompaniesByIndustryPaginated } from "@/lib/actions/company-list-actions";

const PAGE_SIZE = 10;

interface Industry {
  value: string;
  label: string;
}

interface CompanyItem {
  id: string;
  name: string;
  logo_url: string | null;
  thumbnail_url: string | null;
}

interface IndustryEntry {
  companies: CompanyItem[];
  totalCount: number;
}

interface Props {
  industries: Industry[];
  initialData: Record<string, IndustryEntry>;
}

export default function CompanySectionLazy({ industries, initialData }: Props) {
  const [industryData, setIndustryData] = useState<Record<string, IndustryEntry>>(initialData);
  const [isPending, startTransition] = useTransition();
  const [loadingIndustry, setLoadingIndustry] = useState<string | null>(null);

  const loadMore = useCallback((industryValue: string) => {
    const current = industryData[industryValue];
    if (!current || current.companies.length >= current.totalCount) return;
    if (loadingIndustry === industryValue) return;

    setLoadingIndustry(industryValue);

    startTransition(async () => {
      const result = await getCompaniesByIndustryPaginated(
        industryValue,
        current.companies.length,
        PAGE_SIZE
      );

      if (result.data) {
        setIndustryData((prev) => ({
          ...prev,
          [industryValue]: {
            ...prev[industryValue],
            companies: [...prev[industryValue].companies, ...result.data!],
          },
        }));
      }
      setLoadingIndustry(null);
    });
  }, [industryData, loadingIndustry]);

  return (
    <div id="company" className="scroll-mt-20">
      {industries.map((industry) => {
        const data = industryData[industry.value];
        if (!data) return null;
        const hasMore = data.companies.length < data.totalCount;
        return (
          <div key={industry.value} id={`company-${industry.value}`} className="scroll-mt-20 py-4">
            <CompanySection
              title={industry.label}
              companies={data.companies}
              hasMore={hasMore}
              isLoadingMore={loadingIndustry === industry.value}
              onReachEnd={() => loadMore(industry.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
