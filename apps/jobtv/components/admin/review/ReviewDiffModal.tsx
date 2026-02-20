"use client";

import React from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

interface DiffField {
  label: string;
  old: any;
  new: any;
  isChanged: boolean;
}

interface ReviewDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: DiffField[];
}

export default function ReviewDiffModal({
  isOpen,
  onClose,
  title,
  fields
}: ReviewDiffModalProps) {
  if (!isOpen) return null;

  return (
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
                <div className="col-span-3 flex items-center">
                  <span className="text-sm font-bold text-gray-700">{field.label}</span>
                </div>
                <div className="col-span-4">
                  <div className="text-sm text-gray-500 break-words whitespace-pre-wrap">
                    {field.old === null || field.old === undefined || field.old === "" ? (
                      <span className="text-gray-300 italic">（未設定）</span>
                    ) : typeof field.old === "string" ? (
                      field.old
                    ) : (
                      JSON.stringify(field.old)
                    )}
                  </div>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {field.isChanged && <ArrowRight className="w-4 h-4 text-green-500" />}
                </div>
                <div className="col-span-4">
                  <div className={`text-sm break-words whitespace-pre-wrap ${field.isChanged ? "text-gray-900 font-bold" : "text-gray-500"}`}>
                    {field.new === null || field.new === undefined || field.new === "" ? (
                      <span className="text-gray-300 italic">（未設定）</span>
                    ) : typeof field.new === "string" ? (
                      field.new
                    ) : (
                      JSON.stringify(field.new)
                    )}
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
  );
}

