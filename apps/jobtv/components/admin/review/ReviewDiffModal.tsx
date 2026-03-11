"use client";

import React, { useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import VideoPreviewModal from "@/components/VideoPreviewModal";

interface DiffField {
  label: string;
  old: any;
  new: any;
  isChanged: boolean;
  fieldType?: "image" | "video";
}

interface ReviewDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: DiffField[];
}

function renderCellValue(value: any, fieldType?: "image" | "video", onPlayVideo?: (url: string) => void) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300 italic">（未設定）</span>;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);

  return (
    <div className="space-y-1">
      <span className="break-all">{text}</span>
      {fieldType === "image" && typeof value === "string" && value !== "" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-24 object-contain rounded border border-gray-200" />
      )}
      {fieldType === "video" && typeof value === "string" && value !== "" && onPlayVideo && (
        <button
          type="button"
          onClick={() => onPlayVideo(value)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          ▶ 再生
        </button>
      )}
    </div>
  );
}

export default function ReviewDiffModal({
  isOpen,
  onClose,
  title,
  fields
}: ReviewDiffModalProps) {
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string>("");

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
              <h2 className="text-xl font-black text-gray-900">変更内容の確認</h2>
              <p className="text-sm text-gray-500 font-medium">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-90" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-12 gap-4 text-xs font-black text-gray-400 uppercase tracking-wider px-4">
              <div className="col-span-3">項目</div>
              <div className="col-span-4">変更前</div>
              <div className="col-span-1 flex justify-center text-gray-300">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="col-span-4 text-green-600">変更後</div>
            </div>

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-4 p-4 rounded-xl border transition-colors ${
                    field.isChanged ? "bg-green-50/30 border-green-100" : "bg-gray-50/30 border-gray-100 opacity-60"
                  }`}
                >
                  <div className="col-span-3 flex items-start pt-0.5">
                    <span className="text-sm font-bold text-gray-700">{field.label}</span>
                  </div>
                  <div className="col-span-4">
                    <div className="text-sm text-gray-500 whitespace-pre-wrap">
                      {renderCellValue(field.old, field.fieldType, (url) => {
                        setPreviewVideoTitle(field.label);
                        setPreviewVideoUrl(url);
                      })}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {field.isChanged && <ArrowRight className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="col-span-4">
                    <div className={`text-sm whitespace-pre-wrap ${field.isChanged ? "text-gray-900 font-bold" : "text-gray-500"}`}>
                      {renderCellValue(field.new, field.fieldType, (url) => {
                        setPreviewVideoTitle(field.label);
                        setPreviewVideoUrl(url);
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <StudioButton variant="outline" onClick={onClose}>
              閉じる
            </StudioButton>
          </div>
        </div>
      </div>

      {previewVideoUrl && (
        <VideoPreviewModal
          video={{ video_url: previewVideoUrl, title: previewVideoTitle }}
          onClose={() => setPreviewVideoUrl(null)}
        />
      )}
    </>
  );
}
