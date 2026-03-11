"use client";

import { Building2 } from "lucide-react";
import CompanyCard from "./CompanyCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import SectionHeader from "./SectionHeader";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  thumbnail_url?: string | null;
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
    <section className="my-2 py-0">
      <div className="container mx-auto px-4">
        {title && (
          <SectionHeader icon={Building2} title={title} titleClassName={classes.textPrimary} />
        )}
        <div className="-mx-4 md:mx-0">
          <HorizontalScrollContainer>
            <div className="flex gap-4 min-w-max pl-4 md:px-4 pb-6">
              {companies.map((company) => (
                <div key={company.id} className={cn(HORIZONTAL_CARD_WIDTH.company, "flex-shrink-0")}>
                  <CompanyCard
                    id={company.id}
                    name={company.name}
                    thumbnailUrl={company.thumbnail_url}
                    logoUrl={company.logo_url}
                  />
                </div>
              ))}
            </div>
          </HorizontalScrollContainer>
        </div>
      </div>
    </section>
  );
}
