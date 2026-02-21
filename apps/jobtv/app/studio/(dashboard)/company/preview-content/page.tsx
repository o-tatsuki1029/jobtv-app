"use client";

import { useEffect, useState } from "react";
import CompanyProfileView, { CompanyData } from "@/components/company";
import { MainThemeProvider } from "@/components/company/CompanyPageThemeContext";

export default function PreviewContentPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    // 親ウィンドウ（管理画面）からのデータを受け取る
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "UPDATE_PREVIEW") {
        setCompany(event.data.company);
      }
    };

    window.addEventListener("message", handleMessage);

    // 初回読み込み時に親に通知してデータを要求
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading preview...</div>
    );
  }

  return (
    <MainThemeProvider hasHeader={false}>
      <CompanyProfileView company={company} />
    </MainThemeProvider>
  );
}
