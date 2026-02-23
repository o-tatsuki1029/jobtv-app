"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import SectionHeader from "./SectionHeader";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Account {
  id: string;
  name: string;
  avatar: string;
}

interface AccountListProps {
  accounts: Account[];
}

export default function AccountList({ accounts }: AccountListProps) {
  const { classes } = useMainTheme();

  return (
    <section className="mb-12 py-6">
      <div className="container mx-auto px-4">
        <SectionHeader icon={Users} title="運用アカウント一覧" titleClassName={classes.textPrimary} />
        <HorizontalScrollContainer scrollAmount={160}>
          <div className="flex gap-6 min-w-max py-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col items-center cursor-pointer group flex-shrink-0 w-[112px] sm:w-[120px]"
              >
                <div className="relative mb-3 w-20 h-20 sm:w-24 sm:h-24">
                  <Image
                    src={account.avatar}
                    alt={account.name}
                    width={96}
                    height={96}
                    className="rounded-full object-cover group-hover:ring-2 group-hover:ring-red-500 transition-all w-full h-full"
                    loading="lazy"
                  />
                </div>
                <span
                  className={cn(
                    "text-sm font-medium text-center group-hover:text-red-500 transition-colors line-clamp-2 w-24 sm:w-28",
                    classes.textPrimary
                  )}
                >
                  {account.name}
                </span>
              </div>
            ))}
          </div>
        </HorizontalScrollContainer>
      </div>
    </section>
  );
}
