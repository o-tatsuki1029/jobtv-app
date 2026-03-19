"use client";

import { useRef, useEffect, useCallback } from "react";
import { Building2, Loader2 } from "lucide-react";
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
  /** 追加読み込み可能な残りがあるか */
  hasMore?: boolean;
  /** 追加読み込み中か */
  isLoadingMore?: boolean;
  /** 右端に到達したときに呼ばれるコールバック */
  onReachEnd?: () => void;
}

export default function CompanySection({ title, companies, hasMore, isLoadingMore, onReachEnd }: CompanySectionProps) {
  const { classes } = useMainTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 右端のセンチネル要素が見えたら onReachEnd を発火
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) {
      onReachEndRef.current?.();
    }
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: el.closest(".overflow-x-auto"),
      rootMargin: "0px 200px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, handleIntersect, companies.length]);

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
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex-shrink-0 flex items-center justify-center w-16"
                >
                  {isLoadingMore && (
                    <Loader2 className={cn("w-6 h-6 animate-spin", classes.textSecondary)} />
                  )}
                </div>
              )}
            </div>
          </HorizontalScrollContainer>
        </div>
      </div>
    </section>
  );
}
