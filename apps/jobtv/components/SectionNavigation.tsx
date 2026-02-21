"use client";

import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import { HEADER_HEIGHT_PX_DESKTOP, HEADER_HEIGHT_PX_MOBILE } from "@/constants/header-layout";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Section {
  id: string;
  label: string;
}

interface SectionNavigationProps {
  sections: Section[];
}

export default function SectionNavigation({ sections }: SectionNavigationProps) {
  const { classes } = useMainTheme();

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const isMobile = window.innerWidth < 768;
      const headerHeight = isMobile ? HEADER_HEIGHT_PX_MOBILE : HEADER_HEIGHT_PX_DESKTOP;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleScrollToSection(section.id)}
            className={cn(
              "px-4 py-2 md:px-6 md:py-3 font-semibold text-xs md:text-sm lg:text-base transition-all rounded-lg shadow-sm hover:shadow-md",
              classes.cardBg,
              classes.cardBgHover,
              classes.cardBorder,
              classes.cardBorderHover,
              classes.textPrimary
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

