"use client";

import React from "react";
import { usePathname } from "next/navigation";
import StudioPageLayout from "@/components/studio/templates/StudioPageLayout";

export default function StudioLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // プレビューコンテンツ用ページの場合は、レイアウトを適用せず中身だけを返す
  if (
    pathname === "/studio/company/preview-content" ||
    pathname === "/studio/jobs/preview-content" ||
    pathname === "/studio/sessions/preview-content"
  ) {
    return <>{children}</>;
  }

  return <StudioPageLayout>{children}</StudioPageLayout>;
}

