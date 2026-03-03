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
  /** 指定時は外部リンクとして新しいタブで開く */
  href?: string;
}

interface AccountListProps {
  accounts: Account[];
}

export default function AccountList({ accounts }: AccountListProps) {
  const { classes } = useMainTheme();

  return (
    <section className="mb-12 py-6">
      <div className="container mx-auto px-4">
        <SectionHeader
          icon={Users}
          title="JOBTV公式アンバサダー"
          titleClassName={classes.textPrimary}
          className="mb-2"
        />
        <p className={cn("text-sm mb-3", classes.textSecondary)}>
          就活に役立つ動画を配信しているJOBTV公式認定アカウントです。気になるアカウントをフォローしてチェックしてみよう。
        </p>
        <div className={cn("border-b mb-4", classes.sectionBorder)} />
        <HorizontalScrollContainer scrollAmount={160}>
          <div className="flex gap-6 min-w-max py-2">
            {accounts.map((account) => {
              const content = (
                <>
                  <div className="relative mb-3 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-gray-200 p-0.5 group-hover:border-red-500 transition-colors shrink-0">
                    <Image
                      src={account.avatar}
                      alt={account.name}
                      width={112}
                      height={112}
                      className="rounded-full object-cover w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium text-center group-hover:text-red-500 transition-colors line-clamp-2 w-28 sm:w-32",
                      classes.textPrimary
                    )}
                  >
                    {account.name}
                  </span>
                </>
              );
              const className = "flex flex-col items-center cursor-pointer group flex-shrink-0 w-[120px] sm:w-[136px]";
              if (account.href) {
                return (
                  <a
                    key={account.id}
                    href={account.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    {content}
                  </a>
                );
              }
              return (
                <div key={account.id} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
        </HorizontalScrollContainer>
      </div>
    </section>
  );
}
