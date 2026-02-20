"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";

export default function VideoPreviewContentPage() {
  const [videoData, setVideoData] = useState<{
    title: string;
    video_url: string;
    thumbnail_url?: string;
  } | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "UPDATE_PREVIEW") {
        setVideoData(event.data.company); // StudioPreviewModal が event.data.company で送るため合わせる
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!videoData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading preview...</div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-900 text-white pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-black mb-8">{videoData.title}</h1>
          <div className="overflow-hidden rounded-lg shadow-2xl border border-gray-800 bg-black">
            <VideoPlayer
              src={videoData.video_url}
              poster={videoData.thumbnail_url}
              className="w-full aspect-video"
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

