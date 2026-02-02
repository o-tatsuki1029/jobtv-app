import React from "react";

interface HeaderContainerProps {
  children: React.ReactNode;
  className?: string; // 背景色、位置、影などのスタイル
}

export default function HeaderContainer({ children }: HeaderContainerProps) {
  return (
    <header
      className={
        "w-full bg-black text-foreground border-b border-gray-800 flex items-center justify-center h-16 md:h-18 pt-[env(safe-area-inset-top)]"
      }
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between">{children}</div>
    </header>
  );
}
