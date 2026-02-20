"use client";

import { useEffect, useState } from "react";
import SessionDetailView, { SessionData } from "@/components/SessionDetailView";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";

export default function SessionPreviewContentPage() {
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "UPDATE_PREVIEW") {
        setSession(event.data.company); // StudioPreviewModal が event.data.company で送るため合わせる
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading preview...</div>
    );
  }

  return (
    <>
      <Header />
      <SessionDetailView session={session} />
      <Footer />
    </>
  );
}

