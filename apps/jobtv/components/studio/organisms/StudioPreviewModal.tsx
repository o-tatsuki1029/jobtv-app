"use client";

import React, { useRef, useEffect } from "react";
import { Monitor, Smartphone } from "lucide-react";
import Logo from "@/components/header/Logo";
import { HEADER_HEIGHT_CLASS } from "@/constants/header-layout";
import StudioButton from "../atoms/StudioButton";

interface StudioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: "desktop" | "mobile";
  setDevice: (device: "desktop" | "mobile") => void;
  companyData: any;
  previewUrl?: string;
}

export default function StudioPreviewModal({
  isOpen,
  onClose,
  device,
  setDevice,
  companyData,
  previewUrl = "/studio/company/preview-content"
}: StudioPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const updatePreviewContent = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_PREVIEW",
          company: companyData
        },
        "*"
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePreviewContent();
    }
  }, [companyData, isOpen]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "PREVIEW_READY") {
        updatePreviewContent();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [companyData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300 h-full">
      {/* プレビューヘッダー */}
      <div
        className={`bg-background text-foreground border-b border-gray-800 ${HEADER_HEIGHT_CLASS} flex items-center flex-shrink-0 pt-[env(safe-area-inset-top)]`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo disableLink />
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-gray-800">
              <span className="bg-white/10 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">
                Preview Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            {/* デバイス切り替えスイッチ */}
            <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800 scale-90 md:scale-100">
              <button
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  device === "desktop" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                <Monitor className="w-4 h-4" />
                PC
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  device === "mobile" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                スマホ
              </button>
            </div>

            <StudioButton
              onClick={onClose}
              variant="outline"
            >
              プレビューを閉じる
            </StudioButton>
          </div>
        </div>
      </div>

      {/* プレビューエリア */}
      <div className="flex-1 overflow-hidden bg-gray-950 flex justify-center p-4 md:p-8">
        <div
          className={`bg-gray-800 transition-all duration-500 shadow-2xl overflow-hidden ${
            device === "mobile"
              ? "w-[390px] h-[844px] border-[12px] border-gray-900 rounded-[3.5rem] relative py-10"
              : "w-full h-full"
          }`}
        >
          {device === "mobile" && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-gray-900 rounded-b-3xl z-50 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
            </div>
          )}
          <iframe ref={iframeRef} src={previewUrl} className="w-full h-full border-none" title="Preview Content" />
        </div>
      </div>
    </div>
  );
}
