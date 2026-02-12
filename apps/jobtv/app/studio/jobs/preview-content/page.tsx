"use client";

import { useEffect, useState } from "react";
import JobDetailView, { JobData } from "@/components/JobDetailView";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";

export default function JobPreviewContentPage() {
  const [job, setJob] = useState<JobData | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "UPDATE_PREVIEW") {
        setJob(event.data.company); // StudioPreviewModal が event.data.company で送るため合わせる
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading preview...</div>
    );
  }

  return (
    <>
      <Header />
      <JobDetailView job={job} />
      <Footer />
    </>
  );
}
