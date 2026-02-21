"use client";

import CompanyCard from "./CompanyCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CompanySectionProps {
  title: string;
  companies: Company[];
}

export default function CompanySection({ title, companies }: CompanySectionProps) {
  const { classes } = useMainTheme();

  if (companies.length === 0) {
    return null;
  }

  return (
    <section className="mb-2 py-0">
      <div className="container mx-auto px-4">
        {title && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className={cn("text-2xl md:text-3xl font-bold", classes.textPrimary)}>{title}</h2>
            </div>
          </div>
        )}
        <HorizontalScrollContainer>
          <div className="flex gap-4 min-w-max px-4 pb-6">
            {companies.map((company) => (
              <div key={company.id} className={cn(HORIZONTAL_CARD_WIDTH.company, "flex-shrink-0")}>
                <CompanyCard id={company.id} name={company.name} logoUrl={company.logo_url} />
              </div>
            ))}
          </div>
        </HorizontalScrollContainer>
      </div>
    </section>
  );
}
