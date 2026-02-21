import React from "react";
import { HEADER_HEIGHT_CLASS } from "@/constants/header-layout";

interface HeaderContainerProps {
  children: React.ReactNode;
  className?: string; // 背景色、位置、影などのスタイル
}

export default function HeaderContainer({ children }: HeaderContainerProps) {
  return (
    <header
      className={`sticky top-0 z-50 w-full bg-black text-foreground border-b border-gray-800 flex items-center justify-center ${HEADER_HEIGHT_CLASS} pt-[env(safe-area-inset-top)]`}
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between">{children}</div>
    </header>
  );
}
