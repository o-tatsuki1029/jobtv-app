"use client";

import { BookOpen } from "lucide-react";
import ProgramCard from "./ProgramCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import SectionHeader from "./SectionHeader";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

export interface ShundiaryItem {
  id: string;
  title: string;
  thumbnail: string;
  channel?: string;
}

interface ShundiarySectionProps {
  title: string;
  description?: string;
  items: ShundiaryItem[];
  onItemClick?: (item: ShundiaryItem) => void;
}

export default function ShundiarySection({
  title,
  description,
  items = [],
  onItemClick
}: ShundiarySectionProps) {
  const { classes } = useMainTheme();
  const list = Array.isArray(items) ? items : [];

  return (
    <section className="mb-12">
      <div className="container mx-auto px-4">
        {title && (
          <SectionHeader
            icon={BookOpen}
            title={title}
            showMore={false}
            titleClassName={classes.textPrimary}
            className="mb-2"
          />
        )}
        {description && (
          <p className={cn("text-sm mb-3", classes.textSecondary)}>{description}</p>
        )}
        <div className={cn("border-b mb-4", classes.sectionBorder)} />
        <div className="-mx-4 md:mx-0">
          <HorizontalScrollContainer>
            <div className="flex gap-5 min-w-max pl-4 md:pl-0">
              {list.map((item) => (
                <div
                  key={item.id}
                  className={cn(HORIZONTAL_CARD_WIDTH.video, "flex-shrink-0")}
                  onClick={() => onItemClick?.(item)}
                >
                  <ProgramCard
                    title={item.title}
                    thumbnail={item.thumbnail}
                    channel={item.channel ?? "しゅんダイアリー"}
                    vertical={false}
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
