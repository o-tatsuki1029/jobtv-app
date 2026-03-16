import type { Metadata } from "next";
import AuthHeader from "@/components/header/AuthHeader";
import { ROBOTS_NOINDEX } from "@/constants/site";

export const metadata: Metadata = {
  robots: ROBOTS_NOINDEX,
};

export default function EventLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuthHeader />
      <main className="min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4.5rem)] flex flex-col overflow-y-auto bg-white text-gray-900 light-theme">
        {children}
      </main>
    </>
  );
}
