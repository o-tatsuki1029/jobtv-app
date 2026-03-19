"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import VideoModal from "@/components/VideoModal";

interface ModalVideoState {
  videoUrl: string;
  streamingUrl?: string | null;
  title: string;
  thumbnail?: string;
  aspectRatio?: "video" | "portrait";
}

interface VideoModalContextValue {
  openVideoModal: (video: ModalVideoState) => void;
}

const VideoModalContext = createContext<VideoModalContextValue | null>(null);

export function useVideoModal() {
  const ctx = useContext(VideoModalContext);
  if (!ctx) throw new Error("useVideoModal must be used within VideoModalProvider");
  return ctx;
}

export default function VideoModalProvider({ children }: { children: ReactNode }) {
  const [modalVideo, setModalVideo] = useState<ModalVideoState | null>(null);

  const openVideoModal = useCallback((video: ModalVideoState) => {
    setModalVideo(video);
  }, []);

  return (
    <VideoModalContext.Provider value={{ openVideoModal }}>
      {children}
      {modalVideo && (
        <VideoModal
          isOpen={true}
          onClose={() => setModalVideo(null)}
          videoUrl={modalVideo.videoUrl}
          streamingUrl={modalVideo.streamingUrl}
          title={modalVideo.title}
          thumbnail={modalVideo.thumbnail}
          aspectRatio={modalVideo.aspectRatio}
        />
      )}
    </VideoModalContext.Provider>
  );
}
