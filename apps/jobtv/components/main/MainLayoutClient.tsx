"use client";

import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import { MainThemeProvider } from "@/components/theme/PageThemeContext";

export default function MainLayoutClient({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <MainThemeProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </MainThemeProvider>
  );
}
