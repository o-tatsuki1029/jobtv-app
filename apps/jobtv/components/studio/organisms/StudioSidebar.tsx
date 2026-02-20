"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDIO_NAVIGATION, STUDIO_BOTTOM_NAVIGATION } from "../constants";
import StudioNavItem from "../molecules/StudioNavItem";
import { getUserInfo } from "@/lib/actions/user-actions";

export default function StudioSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const result = await getUserInfo();
        if (result.error) {
          console.error("Failed to fetch user info:", result.error);
          setUserName(null);
          setCompanyName(null);
        } else {
          setUserName(result.userName);
          setCompanyName(result.companyName);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserName(null);
        setCompanyName(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-black text-white">
      <div className="p-6">
        <Link href="/studio" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center transition-transform group-hover:scale-110">
            <span className="text-black font-black text-xl">J</span>
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase">JobTV Studio</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {STUDIO_NAVIGATION.map((item) => (
          <StudioNavItem
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      <div className="px-4 pb-4 space-y-1">
        {STUDIO_BOTTOM_NAVIGATION.map((item) => (
          <StudioNavItem
            key={item.name}
            name={item.name}
            href={item.href}
            icon={item.icon}
            isActive={pathname.startsWith("/studio/settings")}
          />
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        {!isLoading && (companyName || userName) && (
          <div className="px-4 py-2 space-y-1">
            {companyName && <div className="text-sm font-bold text-white">{companyName}</div>}
            {userName && <div className="text-xs font-medium text-gray-300">{userName}</div>}
          </div>
        )}
      </div>
    </aside>
  );
}
